'use client';

import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { Alert, Button, Field, TextInput } from '@/components/ui';
import { api } from '@/lib/api';
import { useAction } from '@/lib/useAction';
import { passwordProblem } from '@/lib/validation';

function ResetForm() {
    const token = useSearchParams()?.get('token') ?? '';
    const [password, setPassword] = useState('');
    const [again, setAgain] = useState('');
    const [done, setDone] = useState(false);
    const action = useAction();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const problem = passwordProblem(password);
        if (problem) return action.fail(problem);
        if (password !== again) return action.fail('The two passwords do not match.');
        const ok = await action.run(async () => {
            await api.resetPassword(token, password);
            return true;
        });
        if (ok) setDone(true);
    }

    if (!token) {
        return (
            <div className="space-y-4">
                <Alert kind="error" title="This link is not complete">
                    Please open the link from your email again, or ask for a new one.
                </Alert>
                <Link href="/forgot-password" className="inline-block text-sm font-medium text-brand-700 hover:underline">
                    Ask for a new link
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="space-y-4">
                <Alert kind="success" title="Password changed">
                    You can now log in with your new password.
                </Alert>
                <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
                >
                    Go to log in
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {action.error && (
                <Alert kind="error">
                    {action.error}{' '}
                    {/expired|invalid/i.test(action.error) && (
                        <Link href="/forgot-password" className="font-medium underline">
                            Ask for a new link
                        </Link>
                    )}
                </Alert>
            )}
            <Field label="New password" htmlFor="password" hint="At least 8 characters, with a letter and a number.">
                <TextInput
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </Field>
            <Field label="Type it again" htmlFor="again">
                <TextInput
                    id="again"
                    type="password"
                    autoComplete="new-password"
                    value={again}
                    onChange={(e) => setAgain(e.target.value)}
                />
            </Field>
            <Button type="submit" className="w-full" loading={action.busy} disabled={!password || !again}>
                Save new password
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <AuthShell title="Choose a new password" subtitle="Pick something you have not used on other sites.">
            <Suspense>
                <ResetForm />
            </Suspense>
        </AuthShell>
    );
}
