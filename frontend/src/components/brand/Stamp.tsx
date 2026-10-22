import type { CSSProperties, ReactNode } from 'react';

// A rubber-stamp mark. Used on the home page art and on the document detail page.
export type StampTone = 'valid' | 'expiring' | 'expired' | 'review';

// Full class names written out so Tailwind can find them.
const TONE: Record<StampTone, string> = {
  valid: 'text-brand-700',
  expiring: 'text-amber-700',
  expired: 'text-red-700',
  review: 'text-violet-700',
};

export function Stamp({
  tone,
  children,
  rotate = -8,
  delayMs,
  className = '',
}: {
  tone: StampTone;
  children: ReactNode;
  rotate?: number; // degrees
  delayMs?: number; // when set, the stamp "lands" with an animation after this delay
  className?: string;
}) {
  const animated = delayMs !== undefined;
  return (
    <span
      className={`stamp ${animated ? 'stamp-animate' : ''} inline-block select-none whitespace-nowrap rounded-md border-4 border-double border-current px-3 py-1 font-stamp text-base uppercase tracking-[0.16em] mix-blend-multiply ${TONE[tone]} ${className}`}
      style={
        { '--r': `${rotate}deg`, animationDelay: animated ? `${delayMs}ms` : undefined } as CSSProperties
      }
    >
      {children}
    </span>
  );
}