'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
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
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
                <Link href="/documents" className="text-lg font-bold tracking-tight text-indigo-700">
                    DocDue
                </Link>

                <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={isActive(link.href) ? 'page' : undefined}
                            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${isActive(link.href)
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="text-right text-xs leading-tight text-slate-500">
                        <p className="font-medium text-slate-700">{user?.full_name}</p>
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