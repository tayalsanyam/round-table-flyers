import type { Metadata, Viewport } from 'next';
import './globals.css';
import SiteFooter from './site-footer';
import { OG_IMAGE_PATH, SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

const siteTitle = 'Round Table · Flyer Finisher';
const ogImageUrl = `${SITE_URL}${OG_IMAGE_PATH}`;
const canonicalUrl = `${SITE_URL}/`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteTitle,
  description: SITE_DESCRIPTION,
  icons: {
    icon: '/branding/rtilogoblack.png',
    apple: '/branding/rtilogoblack.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Flyer Finisher" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Round Table Flyer Finisher — Correctly brand your flyers in minutes." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={ogImageUrl} />
      </head>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
