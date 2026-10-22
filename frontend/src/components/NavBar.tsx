'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Logo } from './brand/Logo';
import { Button } from './ui';

export function NavBar() {
  const { user, tenant, isAdmin, canManageTeam, logout } = useAuth();
  const pathname = usePathname() ?? ''; // `?? ''` keeps TypeScript happy on every Next.js version

  const links = [
    { href: '/documents', label: 'Documents', show: true },
    { href: '/documents/new', label: 'Upload', show: true },
    { href: '/team', label: 'Team', show: canManageTeam },
    { href: '/admin', label: 'Admin tools', show: isAdmin },
    { href: '/settings', label: 'Settings', show: true },
  ].filter((link) => link.show);

  // "Documents" stays highlighted on a document's own page, but not on the Upload page.
  function isActive(href: string): boolean {
    if (href === '/documents') {
      return pathname === '/documents' || (pathname.startsWith('/documents/') && pathname !== '/documents/new');
    }
    return pathname === href;
  }

  return (
    <header className="border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/documents" aria-label="DocDue, your documents">
          <Logo />
        </Link>

        <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive(link.href)
                  ? 'bg-brand-800 text-white'
                  : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs leading-tight text-ink-500">
            <p className="font-medium text-ink-700">{user?.full_name}</p>
            <p>
              {tenant?.name} · {user?.role}
            </p>
          </div>
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}