// The DocDue mark: two orange documents, a bold navy tick over them and an amber ring
// swooshing round the lot ("checked, on time"). It sits on a round cream badge so it reads the
// same on light and dark pages.

const NAVY = '#1f3a5f';
const CREAM = '#fdecc0';

/** The artwork on its own, 64 x 64, without the tile. Shared by the logo and the favicon. */
export function LogoArt() {
  return (
    <>
      {/* back document */}
      <path d="M13 9h18l7 7v26a2.5 2.5 0 0 1-2.5 2.5h-22A2.5 2.5 0 0 1 11 42V11.5A2.5 2.5 0 0 1 13 9Z" fill="#f4a261" />
      {/* front document with a folded corner */}
      <path d="M24 14h17l8 8v28a2.5 2.5 0 0 1-2.5 2.5h-22.5A2.5 2.5 0 0 1 21.5 50V16.5A2.5 2.5 0 0 1 24 14Z" fill="#e8622c" />
      <path d="M41 14v6.5a1.5 1.5 0 0 0 1.5 1.5H49Z" fill="#b9431a" />
      <path d="M27 28h14M27 34h9" stroke="#fbd0b4" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* the amber swoosh */}
      <ellipse cx="32" cy="42" rx="25" ry="7.5" transform="rotate(-18 32 42)" fill="none" stroke="#f5a524" strokeWidth="2.6" />
      {/* the tick, with a cream edge so it lifts off the documents */}
      <path d="M17 31l10 11 20-25" fill="none" stroke={CREAM} strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 31l10 11 20-25" fill="none" stroke={NAVY} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  // No background shape: just the artwork. The tick has its own cream edge, so it stays
  // readable on both light and dark pages.
  return (
    <svg viewBox="4 4 56 54" className={className} role="img" aria-label="DocDue">
      <LogoArt />
    </svg>
  );
}

/** tone="light" is for dark backgrounds. */
export function Logo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-10" />
      <span className="font-display text-[1.45rem] font-black uppercase leading-none tracking-[0.07em]">
        <span className={tone === 'light' ? 'text-white' : 'text-[#1f3a5f]'}>Doc</span>
        <span className={tone === 'light' ? 'text-amber-300' : 'text-[#e8622c]'}>Due</span>
        <span aria-hidden="true" className="ml-1 inline-block size-1.5 rounded-full bg-amber-400" />
      </span>
    </span>
  );
}
