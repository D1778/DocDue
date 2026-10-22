// Small original illustrations. All are code (SVG or HTML), so there are no image files
// to download, no licences to check and nothing that can break at deploy time.

/** Step 1: a document dropping into a tray. */
export function UploadArt({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 240 160" className={className} role="img" aria-label="A document being placed in a tray">
            <ellipse cx="120" cy="146" rx="84" ry="8" className="fill-ink-200" />
            <rect x="82" y="22" width="76" height="96" rx="4" className="fill-white stroke-ink-300" strokeWidth="2" transform="rotate(-5 120 70)" />
            <path d="M98 50h44M98 64h44M98 78h28" className="stroke-ink-200" strokeWidth="5" strokeLinecap="round" transform="rotate(-5 120 70)" />
            <path d="M120 112V96m0 0-8 8m8-8 8 8" className="fill-none stroke-brand-600" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 100h152l-12 40a6 6 0 0 1-6 4H62a6 6 0 0 1-6-4Z" className="fill-brand-700" />
            <path d="M44 100h152" className="stroke-brand-900" strokeWidth="3" strokeLinecap="round" />
            <rect x="92" y="118" width="56" height="8" rx="4" className="fill-brand-900" opacity="0.35" />
        </svg>
    );
}

/** Step 2: the date on a scan, highlighted, with how sure DocDue is. */
export function ScanMock({ className = '' }: { className?: string }) {
    return (
        <div className={`relative ${className}`} role="img" aria-label="A scanned document with the expiry date highlighted">
            <div className="rounded-sm border border-ink-200 bg-white p-4 shadow-[0_14px_30px_-16px_rgba(14,21,18,0.4)]">
                <p className="font-display text-sm font-bold">Food licence</p>
                <div className="mt-3 space-y-1.5">
                    <span className="block h-1.5 w-11/12 rounded-full bg-ink-100" />
                    <span className="block h-1.5 w-4/5 rounded-full bg-ink-100" />
                    <span className="block h-1.5 w-2/3 rounded-full bg-ink-100" />
                </div>
                <p className="mt-4 font-stamp text-sm text-ink-700">
                    Valid until{' '}
                    <mark className="rounded-[3px] bg-amber-300/70 px-1 text-ink-950 outline-2 outline-offset-2 outline-amber-500">
                        15/03/2031
                    </mark>
                </p>
            </div>
            <p className="absolute -bottom-3 right-3 rounded-full bg-brand-800 px-3 py-1 text-xs font-medium text-white shadow-md">
                Found automatically, 91% sure
            </p>
        </div>
    );
}

/** Step 3: the reminder email, as people will receive it. */
export function EmailMock({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-lg border border-ink-200 bg-white shadow-[0_14px_30px_-16px_rgba(14,21,18,0.4)] ${className}`} role="img" aria-label="A reminder email listing two documents that need attention">
            <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2.5">
                <span aria-hidden="true" className="size-6 rounded-full bg-brand-800" />
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold">2 documents need attention</p>
                    <p className="truncate text-xs text-ink-500">from DocDue</p>
                </div>
            </div>
            <ul className="divide-y divide-ink-100 text-sm">
                <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="truncate">Fire safety certificate</span>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-300">7 days left</span>
                </li>
                <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="truncate">Food licence</span>
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-300">Expires today</span>
                </li>
            </ul>
        </div>
    );
}

/** Used when a list is empty. */
export function EmptyTrayArt({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 120" className={className} role="img" aria-label="An empty document tray">
            <ellipse cx="100" cy="108" rx="70" ry="6" className="fill-ink-200" />
            <path d="M36 62h128l-10 38a6 6 0 0 1-6 4H52a6 6 0 0 1-6-4Z" className="fill-ink-100 stroke-ink-300" strokeWidth="2" strokeLinejoin="round" />
            <path d="M36 62l16-30h96l16 30" className="fill-white stroke-ink-300" strokeWidth="2" strokeLinejoin="round" />
            <path d="M36 62h40a8 8 0 0 0 8 8h32a8 8 0 0 0 8-8h40" className="fill-none stroke-ink-300" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="152" cy="26" r="9" className="fill-amber-300" />
            <path d="M152 21v6l3 2" className="fill-none stroke-ink-900" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/** Privacy section: a padlock and a link that runs out. */
export function LockArt({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 140" className={className} role="img" aria-label="A padlock and a link with a clock">
            <rect x="62" y="58" width="76" height="62" rx="10" className="fill-brand-600" />
            <path d="M78 58V44a22 22 0 0 1 44 0v14" className="fill-none stroke-brand-700" strokeWidth="9" strokeLinecap="round" />
            <circle cx="100" cy="86" r="8" className="fill-brand-50" />
            <rect x="97" y="88" width="6" height="16" rx="3" className="fill-brand-50" />
            <g transform="translate(138 18)">
                <circle cx="22" cy="22" r="20" className="fill-white stroke-brand-200" strokeWidth="3" />
                <path d="M22 11v12l8 5" className="fill-none stroke-brand-800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </g>
        </svg>
    );
}

/** Team section: three people sharing one list of documents. */
export function TeamMock({ className = '' }: { className?: string }) {
    const people = [
        { initials: 'AN', name: 'Asha Nair', role: 'Admin', tone: 'bg-brand-700 text-white' },
        { initials: 'RK', name: 'Ravi Kumar', role: 'Member', tone: 'bg-amber-300 text-ink-900' },
        { initials: 'SM', name: 'Sara Mathew', role: 'Member', tone: 'bg-ink-800 text-white' },
    ];
    return (
        <ul className={`divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white text-sm ${className}`} aria-label="Example team">
            {people.map((p) => (
                <li key={p.initials} className="flex items-center gap-3 px-4 py-2.5">
                    <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${p.tone}`}>
                        {p.initials}
                    </span>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-auto text-xs text-ink-500">{p.role}</span>
                </li>
            ))}
        </ul>
    );
}