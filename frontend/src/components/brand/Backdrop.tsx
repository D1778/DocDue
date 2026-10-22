// Page backgrounds. Every page gets its own theme, all drawn in the same brand greens
// (plus a touch of amber), and all made from CSS and SVG, so there are no image files.
// They sit behind the content, never take clicks and are hidden from screen readers.

import type { CSSProperties, ReactElement } from 'react';

export type BackdropVariant =
    | 'landing'
    | 'auth'
    | 'vault' // the documents list: ledger paper
    | 'upload' // scanner: dots and corner brackets
    | 'detail' // certificate: guilloche seal
    | 'team' // linked circles
    | 'profile'; // soft waves and a seal

function Blob({ className }: { className: string }) {
    return <div className={`absolute rounded-full blur-3xl ${className}`} />;
}

/** A circular rubber-stamp ring with text around it, used as a watermark. */
function Seal({ className = '', label = 'DOCDUE · VERIFIED · ON TIME · ' }: { className?: string; label?: string }) {
    return (
        <svg viewBox="0 0 200 200" className={className} fill="none">
            <circle cx="100" cy="100" r="92" className="stroke-brand-300" strokeWidth="2" />
            <circle cx="100" cy="100" r="84" className="stroke-brand-200" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="100" cy="100" r="58" className="stroke-brand-300" strokeWidth="2" />
            <path id="seal-ring" d="M100 100m-71 0a71 71 0 1 1 142 0a71 71 0 1 1-142 0" />
            <text className="fill-brand-400 font-stamp" fontSize="13" letterSpacing="3">
                <textPath href="#seal-ring">{label.repeat(2)}</textPath>
            </text>
            <path d="M80 102l15 15 28-32" className="stroke-brand-400" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** A small floating document outline. */
function FloatDoc({ className, rotate, delay = 0 }: { className: string; rotate: number; delay?: number }) {
    return (
        <svg
            viewBox="0 0 60 76"
            className={`drift absolute ${className}`}
            style={{ '--r': `${rotate}deg`, animationDelay: `${delay}s` } as CSSProperties}
            fill="none"
        >
            <path d="M6 4h34l14 14v52a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" className="fill-white/70 stroke-brand-300" strokeWidth="2" />
            <path d="M40 4v12a2 2 0 0 0 2 2h12" className="stroke-brand-300" strokeWidth="2" />
            <path d="M14 32h32M14 42h32M14 52h20" className="stroke-brand-200" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

function FloatClock({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <svg
            viewBox="0 0 48 48"
            className={`drift absolute ${className}`}
            style={{ animationDelay: `${delay}s` } as CSSProperties}
            fill="none"
        >
            <circle cx="24" cy="24" r="20" className="fill-amber-100/70 stroke-amber-300" strokeWidth="2" />
            <path d="M24 12v13l8 5" className="stroke-amber-400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FloatCalendar({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <svg
            viewBox="0 0 56 56"
            className={`drift absolute ${className}`}
            style={{ animationDelay: `${delay}s` } as CSSProperties}
            fill="none"
        >
            <rect x="4" y="8" width="48" height="44" rx="6" className="fill-white/70 stroke-brand-300" strokeWidth="2" />
            <path d="M4 20h48" className="stroke-brand-300" strokeWidth="2" />
            <path d="M16 4v8M40 4v8" className="stroke-brand-400" strokeWidth="3" strokeLinecap="round" />
            <circle cx="18" cy="30" r="2.5" className="fill-brand-300" />
            <circle cx="28" cy="30" r="2.5" className="fill-brand-300" />
            <circle cx="38" cy="30" r="2.5" className="fill-amber-400" />
            <circle cx="18" cy="41" r="2.5" className="fill-brand-300" />
            <circle cx="28" cy="41" r="2.5" className="fill-brand-300" />
        </svg>
    );
}

function Corner({ className }: { className: string }) {
    return (
        <svg viewBox="0 0 60 60" className={`absolute size-16 sm:size-24 ${className}`} fill="none">
            <path d="M4 56V14a10 10 0 0 1 10-10h42" className="stroke-brand-400" strokeWidth="4" strokeLinecap="round" />
        </svg>
    );
}

function Landing() {
    return (
        <>
            <Blob className="-left-24 top-0 size-[26rem] bg-brand-200/60" />
            <Blob className="-right-20 top-72 size-[24rem] bg-amber-200/40" />
            <Blob className="left-1/3 top-[70rem] size-[28rem] bg-brand-100/80" />
            <div className="pat-grid pat-fade-b absolute inset-x-0 top-0 h-[40rem] opacity-70" />
            <FloatDoc className="left-[4%] top-40 hidden w-14 lg:block" rotate={-12} />
            <FloatDoc className="right-[6%] top-[34rem] hidden w-12 lg:block" rotate={10} delay={2} />
            <FloatCalendar className="right-[3%] top-24 hidden w-14 md:block" delay={1} />
            <FloatClock className="left-[2%] top-[38rem] hidden w-12 md:block" delay={3} />
            <Seal className="ring-spin absolute -right-24 top-[52rem] hidden size-80 opacity-60 md:block" />
        </>
    );
}

function Auth() {
    return (
        <>
            <Blob className="-right-10 -top-10 size-72 bg-brand-200/60" />
            <Blob className="-bottom-16 left-1/3 size-72 bg-amber-100/60" />
            <div className="pat-waves absolute inset-0 opacity-70" />
            <Seal className="ring-spin absolute -bottom-20 -right-16 size-72 opacity-70" />
            <FloatCalendar className="right-[12%] top-16 hidden w-14 sm:block" />
        </>
    );
}

function Vault() {
    return (
        <>
            <Blob className="-right-24 -top-24 size-96 bg-brand-200/40" />
            <Blob className="-bottom-24 -left-24 size-96 bg-amber-100/50" />
            <div className="pat-ledger pat-fade-b absolute inset-x-0 top-0 h-[60rem]" />
            {/* a stack of papers leaning on the right edge */}
            <svg viewBox="0 0 260 300" className="absolute -right-10 top-24 hidden h-80 w-72 xl:block" fill="none">
                <rect x="40" y="30" width="170" height="220" rx="10" transform="rotate(8 125 140)" className="fill-white/70 stroke-brand-300" strokeWidth="2.5" />
                <rect x="30" y="20" width="170" height="220" rx="10" transform="rotate(-2 115 130)" className="fill-white/80 stroke-brand-300" strokeWidth="2.5" />
                <path d="M55 70h110M55 95h110M55 120h70" className="stroke-brand-300" strokeWidth="6" strokeLinecap="round" transform="rotate(-2 115 130)" />
                <circle cx="150" cy="180" r="26" className="stroke-amber-400" strokeWidth="4" transform="rotate(-2 115 130)" />
                <path d="m138 180 9 9 16-18" className="stroke-amber-500" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-2 115 130)" />
            </svg>
            <FloatCalendar className="right-[26%] top-20 hidden w-14 lg:block" />
            <FloatClock className="left-[3%] top-64 hidden w-12 xl:block" delay={2} />
            <FloatDoc className="left-[1.5%] top-[30rem] hidden w-12 xl:block" rotate={-10} delay={1} />
        </>
    );
}

function Upload() {
    return (
        <>
            <Blob className="left-1/4 -top-20 size-80 bg-brand-200/35" />
            <Blob className="-right-16 bottom-0 size-80 bg-brand-100/70" />
            <div className="pat-dots pat-fade-b absolute inset-x-0 top-0 h-[40rem] opacity-80" />
            <Corner className="left-3 top-24 sm:left-8" />
            <Corner className="right-3 top-24 rotate-90 sm:right-8" />
            <Corner className="bottom-6 left-3 -rotate-90 sm:left-8" />
            <Corner className="bottom-6 right-3 rotate-180 sm:right-8" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent" />
        </>
    );
}

function Detail() {
    return (
        <>
            <Blob className="-left-20 top-10 size-96 bg-brand-200/40" />
            <Blob className="-right-24 top-1/2 size-96 bg-amber-100/50" />
            <div className="pat-grid pat-fade-b absolute inset-x-0 top-0 h-[44rem]" />
            <Seal className="ring-spin absolute -right-16 top-24 size-72 opacity-70 sm:size-[26rem]" />
            {/* a scattering of tiny calendar ticks along the left edge */}
            <svg viewBox="0 0 40 240" className="absolute left-2 top-40 hidden h-60 w-10 lg:block" fill="none">
                {[10, 50, 90, 130, 170, 210].map((y, i) => (
                    <circle key={y} cx="20" cy={y} r={i === 3 ? 7 : 5} className={i === 3 ? 'fill-amber-400' : 'fill-brand-300'} />
                ))}
                <path d="M20 10v200" className="stroke-brand-200" strokeWidth="2" strokeDasharray="4 6" />
            </svg>
            <FloatCalendar className="right-[30%] top-16 hidden w-12 lg:block" delay={1} />
        </>
    );
}

function Team() {
    return (
        <>
            <Blob className="-left-20 -top-10 size-80 bg-brand-200/60" />
            <svg className="absolute right-0 top-0 h-[28rem] w-[34rem] max-w-full opacity-80" viewBox="0 0 540 440" fill="none">
                <circle cx="420" cy="120" r="110" className="stroke-brand-200" strokeWidth="2" />
                <circle cx="340" cy="190" r="110" className="stroke-brand-300" strokeWidth="2" />
                <circle cx="470" cy="250" r="110" className="stroke-brand-200" strokeWidth="2" />
                <circle cx="420" cy="120" r="8" className="fill-brand-400" />
                <circle cx="340" cy="190" r="8" className="fill-amber-400" />
                <circle cx="470" cy="250" r="8" className="fill-brand-500" />
            </svg>
            <div className="pat-dots pat-fade-t absolute inset-x-0 bottom-0 h-72 opacity-70" />
        </>
    );
}

function Profile() {
    return (
        <>
            <Blob className="-right-20 top-0 size-80 bg-brand-200/35" />
            <div className="pat-waves absolute inset-0 opacity-80" />
            <Seal className="ring-spin absolute -bottom-24 -left-20 size-80 opacity-50" />
        </>
    );
}

const THEMES: Record<BackdropVariant, () => ReactElement> = {
    landing: Landing,
    auth: Auth,
    vault: Vault,
    upload: Upload,
    detail: Detail,
    team: Team,
    profile: Profile,
};

export function Backdrop({ variant, fixed = false }: { variant: BackdropVariant; fixed?: boolean }) {
    const Theme = THEMES[variant];
    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none inset-x-0 top-0 -z-10 overflow-hidden ${
                fixed ? 'fixed bottom-0' : 'absolute bottom-0'
            }`}
        >
            <Theme />
        </div>
    );
}

/** Same Seal, exported for use inside cards. */
export { Seal };
