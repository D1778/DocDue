'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Alert, Button, FullPageSpinner } from './ui';

// Wrap any page that needs a logged-in user. Visitors who are not logged in go to /login.
export function RequireAuth({ children }: { children: ReactNode }) {
    const { status, error, retry } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (status === 'anonymous') router.replace('/login');
    }, [status, router]);

    if (status === 'unreachable') {
        return (
            <div className="mx-auto mt-16 max-w-md space-y-4 px-4">
                <Alert kind="error" title="We can't connect right now">
                    {error}
                </Alert>
                <Button onClick={retry}>Try again</Button>
            </div>
        );
    }

    if (status !== 'authenticated') return <FullPageSpinner />;
    return <>{children}</>;
}