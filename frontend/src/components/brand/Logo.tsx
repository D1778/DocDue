// The DocDue mark: a document page with a folded corner and an amber "due" dot.

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="DocDue">
      <rect width="32" height="32" rx="8" className="fill-brand-800" />
      <path
        d="M10 7h8l5 5v13a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
        className="fill-brand-50"
      />
      <path d="M18 7v4a1 1 0 0 0 1 1h4" className="fill-none stroke-brand-300" strokeWidth="1.5" />
      <path d="M12 17h8M12 20.5h5" className="stroke-brand-700" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23" cy="23" r="4.2" className="fill-amber-400 stroke-brand-800" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight">DocDue</span>
    </span>
  );
}