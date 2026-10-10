import type { SupabaseClient } from '@supabase/supabase-js';

export const DAILY_IMAGE_LIMIT = 5;
export const GENERATION_CAP_MESSAGE = 'Generation capped at 5 Per Day, Lets try again tomorrow.';

/** Calendar day key in Asia/Kolkata (IST). */
export function istDayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Start of the current IST calendar day as a UTC ISO timestamp. */
export function istDayStartIso(now = new Date()) {
  const day = istDayKey(now);
  // IST is UTC+5:30 with no DST.
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

const memoryCounts = new Map<string, { day: string; count: number }>();

function memoryKey(userId: string) {
  return userId;
}

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === 'PGRST205'
    || error.code === '42P01'
    || /flyer_generations/i.test(error.message ?? '');
}

export async function countTodayGenerations(supabase: SupabaseClient, userId: string) {
  const day = istDayKey();
  const { count, error } = await supabase
    .from('flyer_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', istDayStartIso());

  if (error) {
    if (missingTable(error)) {
      const row = memoryCounts.get(memoryKey(userId));
      return row?.day === day ? row.count : 0;
    }
    throw error;
  }

  return count ?? 0;
}

export async function assertCanGenerateImage(supabase: SupabaseClient, userId: string) {
  const used = await countTodayGenerations(supabase, userId);
  if (used >= DAILY_IMAGE_LIMIT) {
    const error = new Error(GENERATION_CAP_MESSAGE);
    error.name = 'GenerationCapError';
    throw error;
  }
  return used;
}

export async function recordImageGeneration(supabase: SupabaseClient, userId: string) {
  const day = istDayKey();
  const { error } = await supabase.from('flyer_generations').insert({ user_id: userId });

  if (error) {
    if (missingTable(error)) {
      const key = memoryKey(userId);
      const row = memoryCounts.get(key);
      memoryCounts.set(key, {
        day,
        count: row?.day === day ? row.count + 1 : 1,
      });
      return;
    }
    throw error;
  }
}
