'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { Alert, Button, Field, TextInput } from '@/components/ui';
import { api } from '@/lib/api';
import { useAction } from '@/lib/useAction';
import { emailLooksValid } from '@/lib/validation';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const action = useAction();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!emailLooksValid(email)) {
            action.fail('Please enter a valid email address.');
            return;
        }
        const done = await action.run(async () => {
            await api.forgotPassword(email.trim().toLowerCase());
            return true;
        });
        if (done) setSent(true);
    }

    return (
        <AuthShell
            title="Forgot your password?"
            subtitle="Enter your email and we will send you a link to choose a new one."
        >
            {sent ? (
                <div className="space-y-4">
                    <Alert kind="success" title="Check your email">
                        If <strong>{email.trim()}</strong> has a DocDue account, a reset link is on its way. It works for
                        30 minutes. Remember to look in your spam folder too.
                    </Alert>
                    <Link href="/login" className="inline-block text-sm font-medium text-brand-700 hover:underline">
                        ← Back to log in
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {action.error && <Alert kind="error">{action.error}</Alert>}
                    <Field label="Email" htmlFor="email">
                        <TextInput
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </Field>
                    <Button type="submit" className="w-full" loading={action.busy} disabled={!email.trim()}>
                        Send reset link
                    </Button>
                    <p className="text-center text-sm text-ink-600">
                        Remembered it?{' '}
                        <Link href="/login" className="font-medium text-brand-700 hover:underline">
                            Log in
                        </Link>
                    </p>
                </form>
            )}
        </AuthShell>
    );
}
