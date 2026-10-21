import type { ReactNode } from 'react';

// The centered card used by the login and register pages.
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
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <p className="mb-6 text-center text-2xl font-bold tracking-tight text-indigo-700">DocDue</p>
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
                    <h1 className="text-xl font-semibold">{title}</h1>
                    <p className="mt-1 mb-6 text-sm text-slate-600">{subtitle}</p>
                    {children}
                </div>
            </div>
        </main>
    );
}