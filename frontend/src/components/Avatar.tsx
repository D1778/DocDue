// The user's picture, or their initials on a green circle when they have not set one.

export function initialsOf(name: string | null | undefined): string {
    return (name ?? '?')
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function Avatar({
    name,
    src,
    className = 'size-9 text-xs',
}: {
    name: string | null | undefined;
    src: string | null | undefined;
    className?: string;
}) {
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- a small data URL; next/image adds nothing here
            <img src={src} alt="" referrerPolicy="no-referrer" className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`} />
        );
    }
    return (
        <span
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-100 font-bold text-brand-900 ring-2 ring-white ${className}`}
        >
            {initialsOf(name)}
        </span>
    );
}
