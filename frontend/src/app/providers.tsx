'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';

// layout.tsx runs on the server, but login state lives in the browser.
// This small client component bridges the two.
export function Providers({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}