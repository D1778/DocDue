import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Bricolage_Grotesque, Public_Sans, Special_Elite } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SplashScreen } from '@/components/SplashScreen';
import { WarmUp } from '@/components/WarmUp';
// Three fonts, each with one job. Next.js downloads them at build time and serves them
// from your own site, so visitors never contact Google.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});
const body = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
});
const stamp = Special_Elite({
  subsets: ['latin'],
  weight: '400', // this font has a single weight, so Next.js needs to be told
  variable: '--font-special-elite',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DocDue: know before it expires',
    template: '%s | DocDue',
  },
  description:
    'Keep every licence, certificate and permit in one place. DocDue reads the expiry date from your scan and emails you before it runs out.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${stamp.variable} min-h-screen bg-paper font-sans text-ink-900 antialiased`}
      >
        <SplashScreen />
        <Providers>{children}</Providers>
        <WarmUp />
      </body>
    </html>
  );
}