import type { Metadata } from 'next';
import './globals.css';
import SiteFooter from './site-footer';

export const metadata: Metadata = {
  title: 'Round Table · Flyer Finisher',
  description: 'Original logos, activity tags and flyer tools for Area 1–18 and RT 1–400.',
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
