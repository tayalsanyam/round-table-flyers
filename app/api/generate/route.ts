import OpenAI, { toFile } from 'openai';
import { mergeFacets } from '@/lib/facets';
import { buildFlyerImagePrompt, type FlyerBrief } from '@/lib/generate-prompt';
import {
  assertCanGenerateImage,
  GENERATION_CAP_MESSAGE,
  recordImageGeneration,
} from '@/lib/generation-limit';
import { facetByLabel } from '@/lib/rti-facets';
import { context, sameOrigin } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_REFERENCES = 2;
const MAX_REFERENCE_BYTES = 10_000_000;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

type Mode = 'prompt' | 'image' | 'edit';

function openaiClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Add OPENAI_API_KEY to your environment to generate flyer images.');
  }
  return new OpenAI({ apiKey });
}

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

function parseMode(value: string): Mode {
  if (value === 'prompt' || value === 'edit') return value;
  return 'image';
}

async function validateImageFiles(files: File[], label: string) {
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`${label} must be PNG, JPG or WebP.`);
    }
    if (file.size > MAX_REFERENCE_BYTES) {
      throw new Error(`Each ${label.toLowerCase()} must be under 10 MB.`);
    }
  }
}

async function readRequest(request: Request): Promise<{
  brief: FlyerBrief;
  mode: Mode;
  references: File[];
  source: File | null;
}> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const references = form.getAll('references')
      .filter((item): item is File => item instanceof File && item.size > 0);
    const sourceItem = form.get('source');
    const source = sourceItem instanceof File && sourceItem.size > 0 ? sourceItem : null;

    if (references.length > MAX_REFERENCES) {
      throw new Error('Upload up to 2 reference images.');
    }
    await validateImageFiles(references, 'Reference images');
    if (source) await validateImageFiles([source], 'Source image');

    const mode = parseMode(field(form, 'mode'));
    return {
      mode,
      brief: {
        activity: field(form, 'activity'),
        title: field(form, 'title'),
        date: field(form, 'date'),
        time: field(form, 'time'),
        showTime: field(form, 'showTime') === '1',
        venue: field(form, 'venue'),
        area: field(form, 'area'),
        showArea: field(form, 'showArea') === '1',
        rt: field(form, 'rt'),
        rtPrefix: field(form, 'rtPrefix'),
        details: field(form, 'details'),
        style: field(form, 'style'),
        editInstruction: field(form, 'editInstruction'),
        isEdit: mode === 'edit',
        referenceCount: mode === 'edit' ? (source ? 1 : 0) : references.length,
      },
      references,
      source,
    };
  }

  const body = await request.json() as FlyerBrief & { mode?: Mode };
  const mode = parseMode(body.mode ?? 'image');
  return {
    mode,
    brief: {
      ...body,
      isEdit: mode === 'edit',
      referenceCount: 0,
    },
    references: [],
    source: null,
  };
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
    }

    const { supabase, user } = await context();
    if (!user) {
      return Response.json({ error: 'Sign in to generate flyer artwork.' }, { status: 401 });
    }

    const { brief, mode, references, source } = await readRequest(request);

    const { data: facetRows } = await supabase
      .from('facet_prompts')
      .select('id,label,outline');
    const facets = mergeFacets(facetRows);
    const matched = facets.find(facet => facet.label.toLowerCase() === brief.activity.trim().toLowerCase())
      ?? facetByLabel(brief.activity);
    const prompt = buildFlyerImagePrompt({
      ...brief,
      facetOutline: matched?.outline,
    });

    if (mode === 'prompt') {
      return Response.json({ prompt, mode });
    }

    if (mode === 'edit' && !source) {
      return Response.json({ error: 'Generate a picture first, then edit it.' }, { status: 400 });
    }

    await assertCanGenerateImage(supabase, user.id);

    const client = openaiClient();
    const model = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-1.5';
    const quality = (process.env.OPENAI_IMAGE_QUALITY?.trim() || 'high') as 'low' | 'medium' | 'high';
    const usingDalle = model.startsWith('dall-e');

    if ((references.length || source) && usingDalle) {
      return Response.json({
        error: 'Reference and edit images need a GPT image model. Set OPENAI_IMAGE_MODEL=gpt-image-1.5.',
      }, { status: 400 });
    }

    const editImages = mode === 'edit' && source
      ? [await toFile(source, source.name || 'current-flyer.png', { type: source.type || 'image/png' })]
      : references.length
        ? await Promise.all(
            references.map((file, index) => toFile(file, file.name || `reference-${index + 1}.png`, { type: file.type })),
          )
        : [];

    const result = editImages.length
      ? await client.images.edit({
          model,
          prompt,
          image: editImages,
          size: '1024x1536',
          quality,
          input_fidelity: 'high',
        })
      : await client.images.generate(
          usingDalle
            ? {
                model: model as 'dall-e-3',
                prompt,
                size: '1024x1792',
                quality: 'hd',
                response_format: 'b64_json',
                n: 1,
              }
            : {
                model,
                prompt,
                size: '1024x1536',
                quality,
              },
        );

    const image = result.data?.[0];
    const b64 = image?.b64_json;
    const url = image?.url;

    if (!b64 && !url) {
      return Response.json({ error: 'OpenAI returned no image. Try again in a moment.' }, { status: 502 });
    }

    await recordImageGeneration(supabase, user.id);

    return Response.json({
      mode,
      prompt,
      model,
      imageDataUrl: b64 ? `data:image/png;base64,${b64}` : undefined,
      imageUrl: url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed.';
    console.error('Generate failed', error);

    if (error instanceof Error && error.name === 'GenerationCapError') {
      return Response.json({ error: GENERATION_CAP_MESSAGE, capped: true }, { status: 429 });
    }
    if (message === GENERATION_CAP_MESSAGE) {
      return Response.json({ error: GENERATION_CAP_MESSAGE, capped: true }, { status: 429 });
    }

    if (
      message.includes('OPENAI_API_KEY')
      || message.includes('title')
      || message.includes('120 characters')
      || message.includes('reference')
      || message.includes('Upload up to')
      || message.includes('Describe what to change')
      || message.includes('Generate a picture first')
    ) {
      return Response.json({ error: message }, { status: 400 });
    }
    if (message.includes('401') || /incorrect api key/i.test(message)) {
      return Response.json({ error: 'OpenAI rejected this API key. Check OPENAI_API_KEY.' }, { status: 401 });
    }
    if (/insufficient_quota|billing|quota/i.test(message)) {
      return Response.json({ error: 'OpenAI billing or quota needs attention on this API key.' }, { status: 402 });
    }
    if (/must be verified|organization/i.test(message)) {
      return Response.json({ error: message }, { status: 403 });
    }

    return Response.json({
      error: message.length < 220 ? message : 'Image generation failed. Please try again.',
    }, { status: 503 });
  }
}
