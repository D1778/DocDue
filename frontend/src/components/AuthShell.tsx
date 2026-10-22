import type { ReactNode } from 'react';
import Link from 'next/link';
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
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-10 text-brand-50 lg:flex">
        <Link href="/" className="text-white" aria-label="DocDue home">
          <Logo />
        </Link>
        <div>
          <DocumentStack />
        </div>
        <p className="max-w-sm font-display text-3xl font-bold leading-tight tracking-tight">
          Every expiry date, before it matters.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
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