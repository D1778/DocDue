'use client';

import { useEffect, useRef, useState } from 'react';

// "Continue with Google". Google draws the real button; when it is clicked and the person
// picks an account, Google hands us a signed credential, which the backend then verifies.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleId {
    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, options: Record<string, string | number>) => void;
}
declare global {
    interface Window {
        google?: { accounts: { id: GoogleId } };
    }
}

export const GOOGLE_ENABLED = CLIENT_ID !== '';

function loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        const script = existing ?? document.createElement('script');
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error('Could not load Google sign-in')));
        if (!existing) {
            script.src = SCRIPT_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
    });
}

export function GoogleButton({
    onCredential,
    onProblem,
    text = 'continue_with',
}: {
    onCredential: (credential: string) => void;
    onProblem: (message: string) => void;
    text?: 'continue_with' | 'signin_with' | 'signup_with';
}) {
    const box = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    // Keep the newest callbacks without re-initialising Google every render.
    const handlers = useRef({ onCredential, onProblem });
    useEffect(() => {
        handlers.current = { onCredential, onProblem };
    });

    useEffect(() => {
        if (!GOOGLE_ENABLED || !box.current) return;
        let cancelled = false;
        loadScript()
            .then(() => {
                if (cancelled || !box.current || !window.google) return;
                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: (response) => handlers.current.onCredential(response.credential),
                });
                window.google.accounts.id.renderButton(box.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text,
                    logo_alignment: 'center',
                    width: Math.min(400, box.current.offsetWidth || 320),
                });
                setReady(true);
            })
            .catch((err: Error) => handlers.current.onProblem(err.message));
        return () => {
            cancelled = true;
        };
    }, [text]);

    if (!GOOGLE_ENABLED) {
        return (
            <button
                type="button"
                onClick={() =>
                    onProblem('Google sign-in is not available right now. Please use your email and password.')
                }
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-ink-700 ring-1 ring-inset ring-ink-300 transition hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
                <GoogleG />
                Continue with Google
            </button>
        );
    }
    return (
        <div className="flex min-h-11 w-full justify-center">
            <div ref={box} className={`w-full transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`} />
        </div>
    );
}

function GoogleG() {
    return (
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
    );
}

/** The "or" line between the Google button and the email form. */
export function OrDivider() {
    return (
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-ink-400" role="separator">
            <span className="h-px flex-1 bg-ink-200" />
            or with email
            <span className="h-px flex-1 bg-ink-200" />
        </div>
    );
}
