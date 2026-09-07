import type { Metadata, Viewport } from 'next';
import './globals.css';
import SiteFooter from './site-footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rtiflyers.aaibuilt.com';
const siteDescription = 'Correctly brand your flyers in minutes.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Round Table · Flyer Finisher',
  description: siteDescription,
  icons: {
    icon: '/branding/rtilogoblack.png',
    apple: '/branding/rtilogoblack.png',
  },
  openGraph: {
    title: 'Round Table · Flyer Finisher',
    description: siteDescription,
    siteName: 'Flyer Finisher',
    type: 'website',
    locale: 'en_GB',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Round Table · Flyer Finisher',
    description: siteDescription,
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
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
