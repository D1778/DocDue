'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { Alert, Button, Field, TextInput } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { AccountType } from '@/lib/types';
import { useAction } from '@/lib/useAction';
import { emailLooksValid, passwordProblem } from '@/lib/validation';

export default function RegisterPage() {
  const { status, register } = useAuth();
  const router = useRouter();
  const action = useAction();

  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/documents');
  }, [status, router]);

  // Returns the first thing wrong with the form, or null if everything looks fine.
  function findProblem(): string | null {
    if (fullName.trim().length < 2) return 'Please enter your full name.';
    if (accountType === 'organization' && !organizationName.trim()) {
      return 'Please enter your organization name.';
    }
    if (!emailLooksValid(email)) return 'Please enter a valid email address.';
    return passwordProblem(password);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Check the easy things here so the user gets an instant, friendly message.
    const problem = findProblem();
    setFormError(problem);
    if (problem) return;

    const ok = await action.run(async () => {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        account_type: accountType,
        organization_name: accountType === 'organization' ? organizationName.trim() : undefined,
      });
      return true;
    });
    if (ok) router.replace('/documents');
  }

  const shownError = formError ?? action.error;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free. Keep your documents in one place and get reminded before they expire."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {shownError && <Alert kind="error">{shownError}</Alert>}

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-ink-700">Account type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'personal', title: 'Personal', text: 'Just for me' },
                { value: 'organization', title: 'Organization', text: 'For a team' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg p-3 text-sm ring-1 ring-inset has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600 ${
                  accountType === option.value
                    ? 'bg-brand-50 ring-2 ring-brand-600'
                    : 'bg-white ring-ink-300 hover:bg-ink-50'
                }`}
              >
                <input
                  type="radio"
                  name="account_type"
                  value={option.value}
                  checked={accountType === option.value}
                  onChange={() => setAccountType(option.value)}
                  className="sr-only"
                />
                <span className="block font-medium">{option.title}</span>
                <span className="block text-ink-500">{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Your full name" htmlFor="full_name">
          <TextInput
            id="full_name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>

        {accountType === 'organization' && (
          <Field label="Organization name" htmlFor="organization_name">
            <TextInput
              id="organization_name"
              autoComplete="organization"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
          </Field>
        )}

        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters, with at least one letter and one number."
        >
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" className="w-full" loading={action.busy}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}