import type { ReactNode } from 'react';
import Link from 'next/link';
import { Backdrop } from './brand/Backdrop';
import { DocumentStack } from './brand/DocumentStack';
import { Logo } from './brand/Logo';

// The layout of the login and register pages: a green panel with the stamped documents on
// large screens, and the form next to it. On a phone only the form is shown.
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-10 text-brand-50 lg:flex">
        <div aria-hidden="true" className="pat-grid pat-fade-radial absolute inset-0 opacity-[0.12]" />
        <div aria-hidden="true" className="absolute -left-24 -top-24 size-80 rounded-full bg-brand-700/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-16 size-80 rounded-full bg-amber-300/10 blur-3xl" />
        <div aria-hidden="true" className="ring-spin absolute -bottom-32 -left-32 size-[26rem] rounded-full border border-dashed border-brand-700/60" />
        <Link href="/" className="relative" aria-label="DocDue home">
          <Logo tone="light" />
        </Link>
        <div className="relative">
          <DocumentStack />
        </div>
        <p className="relative max-w-sm font-display text-3xl font-bold leading-tight tracking-tight">
          Every expiry date, before it matters.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <Backdrop variant="auth" fixed />
        <div className="w-full max-w-md rounded-2xl bg-white/85 p-5 shadow-[0_24px_50px_-28px_rgba(14,21,18,0.45)] ring-1 ring-brand-100 backdrop-blur-sm sm:p-8">
          <Link href="/" className="mb-8 inline-block lg:hidden" aria-label="DocDue home">
            <Logo />
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mb-7 mt-2 text-ink-600">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}