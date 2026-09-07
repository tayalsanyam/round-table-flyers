import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Round Table Flyer Finisher — Correctly brand your flyers in minutes.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logo = await readFile(join(process.cwd(), 'public/branding/rtilogowhite.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1f38 0%, #18345d 52%, #11213b 100%)',
          borderBottom: '6px solid #b89749',
        }}
      >
        <img src={logoSrc} width={196} height={196} alt="" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 28,
            textAlign: 'center',
            padding: '0 48px',
          }}
        >
          <div
            style={{
              fontSize: 58,
              color: '#e8c674',
              letterSpacing: 6,
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
            }}
          >
            Flyer Finisher
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#d8e2f0',
              marginTop: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Round Table India
          </div>
          <div
            style={{
              fontSize: 30,
              color: '#eef3fa',
              marginTop: 34,
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            Correctly brand your flyers in minutes.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
