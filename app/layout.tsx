import type { Metadata, Viewport } from 'next';
import './globals.css';
import SiteFooter from './site-footer';

export const metadata: Metadata = {
  title: 'Round Table · Flyer Finisher',
  description: 'Original logos, activity tags and flyer tools for Area 1–18 and RT 1–400.',
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
