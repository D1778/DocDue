'use client';

import { useEffect, useState } from 'react';
import { LogoMark } from './brand/Logo';

// The first thing a visitor sees: the DocDue mark draws itself, a bar fills, then the page
// fades in. It shows once per browser tab (sessionStorage), so moving around the app or
// reloading a page inside it never repeats it.
const KEY = 'docdue:splash-seen';
const SHOW_MS = 3800;

export function SplashScreen() {
    // Starts visible so the server-sent HTML already contains it: no flash of the page underneath.
    const [phase, setPhase] = useState<'show' | 'leaving' | 'gone'>('show');

    useEffect(() => {
        let seen = false;
        try {
            seen = sessionStorage.getItem(KEY) === '1';
            sessionStorage.setItem(KEY, '1');
        } catch {
            // storage blocked: just show the splash
        }
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const wait = seen ? 0 : reduced ? 600 : SHOW_MS;
        const leave = window.setTimeout(() => setPhase('leaving'), wait);
        const gone = window.setTimeout(() => setPhase('gone'), wait + 600);
        return () => {
            window.clearTimeout(leave);
            window.clearTimeout(gone);
        };
    }, []);

    if (phase === 'gone') return null;

    return (
        <div
            role="status"
            aria-label="DocDue is loading"
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-brand-950 px-6 text-brand-50 ${
                phase === 'leaving' ? 'splash-fade-out' : ''
            }`}
        >
            {/* soft rings behind the mark */}
            <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                <div className="ring-spin absolute size-[34rem] max-w-[140vw] rounded-full border border-dashed border-brand-800" />
                <div className="absolute size-[22rem] rounded-full border border-brand-800/70" />
                <div className="splash-pulse absolute size-64 rounded-full bg-brand-800/40 blur-2xl" />
            </div>
            <div aria-hidden="true" className="pat-dots pat-fade-radial absolute inset-0 opacity-[0.18]" />

            <div className="relative flex flex-col items-center text-center">
                <div className="relative">
                    <LogoMark className="size-24 drop-shadow-[0_10px_30px_rgba(56,159,124,0.45)]" />
                    {/* an outline that draws itself around the badge */}
                    <svg viewBox="0 0 96 96" className="absolute inset-0 size-24" aria-hidden="true">
                        <circle
                            cx="48"
                            cy="48"
                            r="47"
                            pathLength="120"
                            className="splash-doc-outline fill-none stroke-amber-300"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <p className="splash-rise mt-6 font-display text-4xl font-extrabold tracking-tight" style={{ animationDelay: '0.8s' }}>
                    DocDue
                </p>
                <p className="splash-rise mt-1 font-stamp text-xs uppercase tracking-[0.25em] text-brand-300 sm:text-sm" style={{ animationDelay: '1.4s' }}>
                    Know before it expires
                </p>
                <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-brand-800" aria-hidden="true">
                    <div className="splash-bar h-full rounded-full bg-gradient-to-r from-brand-400 to-amber-300" />
                </div>
                <p className="splash-rise mt-3 text-xs text-brand-400" style={{ animationDelay: '2s' }}>
                    Getting your documents ready...
                </p>
            </div>
        </div>
    );
}
