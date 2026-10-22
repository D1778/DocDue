'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Avatar } from './Avatar';
import { Logo } from './brand/Logo';
import { Button } from './ui';

export function NavBar() {
  const { user, tenant, canManageTeam, logout } = useAuth();
  const pathname = usePathname() ?? ''; // `?? ''` keeps TypeScript happy on every Next.js version
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/documents', label: 'Documents', show: true },
    { href: '/documents/new', label: 'Upload', show: true },
    { href: '/team', label: 'Team', show: canManageTeam },
    { href: '/profile', label: 'My profile', show: true },
  ].filter((link) => link.show);

  // "Documents" stays highlighted on a document's own page, but not on the Upload page.
  function isActive(href: string): boolean {
    if (href === '/documents') {
      return pathname === '/documents' || (pathname.startsWith('/documents/') && pathname !== '/documents/new');
    }
    return pathname === href;
  }

  // A personal account has one person in it, so "admin" would mean nothing there.
  const accountLabel = tenant?.account_type === 'organization' ? user?.role : 'personal';

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/documents" aria-label="DocDue, your documents">
          <Logo />
        </Link>

        {/* tablet and desktop */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`nav-link whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-brand-600 ${
                isActive(link.href)
                  ? 'bg-brand-100 text-brand-900'
                  : 'text-ink-600 hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.full_name} src={user?.avatar} className="size-9 text-xs" />
            <div className="hidden text-right text-xs leading-tight text-ink-500 lg:block">
              <p className="font-medium text-ink-700">{user?.full_name}</p>
              <p>
                {tenant?.name} · {accountLabel}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>

        {/* phone */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="flex size-10 items-center justify-center rounded-lg text-ink-700 ring-1 ring-inset ring-ink-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-brand-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex items-center gap-3 border-b border-ink-100 pb-3">
            <Avatar name={user?.full_name} src={user?.avatar} className="size-10 text-sm" />
            <div className="min-w-0 text-sm leading-tight">
              <p className="truncate font-medium text-ink-800">{user?.full_name}</p>
              <p className="truncate text-xs text-ink-500">
                {tenant?.name} · {accountLabel}
              </p>
            </div>
          </div>
          <nav aria-label="Main" className="mt-2 flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-3 text-base font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600 ${
                  isActive(link.href)
                    ? 'border-l-4 border-amber-400 bg-brand-100 text-brand-900'
                    : 'border-l-4 border-transparent text-ink-700 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Button variant="secondary" className="mt-3 w-full" onClick={logout}>
            Log out
          </Button>
        </div>
      )}
    </header>
  );
}
