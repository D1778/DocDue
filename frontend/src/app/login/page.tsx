'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { Alert, Button, Field, TextInput } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useAction } from '@/lib/useAction';

export default function LoginPage() {
    const { status, login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const action = useAction();

    // Someone who is already logged in does not need this page.
    useEffect(() => {
        if (status === 'authenticated') router.replace('/documents');
    }, [status, router]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const ok = await action.run(async () => {
            await login(email, password);
            return true;
        });
        if (ok) router.replace('/documents');
    }

    return (
        <AuthShell title="Log in" subtitle="Welcome back. Enter your details to see your documents.">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {action.error && <Alert kind="error">{action.error}</Alert>}

                <Field label="Email" htmlFor="email">
                    <TextInput
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </Field>

                <Field label="Password" htmlFor="password">
                    <TextInput
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </Field>

                <Button
                    type="submit"
                    className="w-full"
                    loading={action.busy}
                    disabled={!email.trim() || !password}
                >
                    Log in
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-600">
                New to DocDue?{' '}
                <Link href="/register" className="font-medium text-brand-700 hover:underline">
                    Create an account
                </Link>
            </p>
        </AuthShell>
    );
}