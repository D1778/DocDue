// Keeps the login tokens in the browser's localStorage.
// If the browser blocks storage (some private modes), it falls back to memory,
// which simply means "you are logged out when you refresh the page".

import type { Tokens } from './types';

const KEY = 'docdue.tokens';
let memoryTokens: Tokens | null = null;

function getStore(): Storage | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

export function getTokens(): Tokens | null {
    const store = getStore();
    if (!store) return memoryTokens;
    try {
        const raw = store.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<Tokens>;
        if (typeof parsed.access_token === 'string' && typeof parsed.refresh_token === 'string') {
            return parsed as Tokens;
        }
    } catch {
        // A damaged value is treated as "not logged in".
    }
    return null;
}

export function saveTokens(tokens: Tokens): void {
    memoryTokens = tokens;
    try {
        getStore()?.setItem(KEY, JSON.stringify(tokens));
    } catch {
        // Storage full or blocked: memory copy still works until the page is closed.
    }
}

export function clearTokens(): void {
    memoryTokens = null;
    try {
        getStore()?.removeItem(KEY);
    } catch {
        // Nothing to do.
    }
}