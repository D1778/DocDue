'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Avatar } from '@/components/Avatar';
import { Alert, Button, Card, Field, PageHeader, TextInput } from '@/components/ui';
import { passwordProblem } from '@/lib/validation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fileToAvatar, validateAvatarFile } from '@/lib/avatar';
import { formatDateTime } from '@/lib/format';
import { useAction } from '@/lib/useAction';

const REMINDERS = [
    { when: '30 days before', note: 'Time to start the renewal', dot: 'bg-brand-300' },
    { when: '14 days before', note: 'Book the appointment', dot: 'bg-brand-400' },
    { when: '7 days before', note: 'Last comfortable week', dot: 'bg-amber-400' },
    { when: '1 day before', note: 'Renew today', dot: 'bg-amber-500' },
    { when: 'On the day', note: 'Expires today', dot: 'bg-red-500' },
];

const PRIVACY = [
    'Your files sit in a private storage bucket.',
    'A link to open a file stops working after a few minutes.',
    'Only the text of the expiry date is kept, never the full text of a document.',
    'You can delete any document for good from its page.',
];

export default function ProfilePage() {
    const { user, tenant, logout, updateUser } = useAuth();
    const picker = useRef<HTMLInputElement>(null);
    const action = useAction();
    const [saved, setSaved] = useState<string | null>(null);

    const pwAction = useAction();
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [newPwAgain, setNewPwAgain] = useState('');
    const [pwSaved, setPwSaved] = useState<string | null>(null);
    const [pwOpen, setPwOpen] = useState(false);

    const organization = tenant?.account_type === 'organization';

    const rows = [
        { label: 'Name', value: user?.full_name },
        { label: 'Email', value: user?.email },
        ...(organization ? [{ label: 'Role', value: user?.role === 'admin' ? 'Admin' : 'Member' }] : []),
        { label: 'Account', value: `${tenant?.name} (${organization ? 'organization' : 'personal'})` },
        { label: 'Member since', value: formatDateTime(user?.created_at) },
        { label: 'Last login', value: user?.last_login_at ? formatDateTime(user.last_login_at) : 'Just now' },
    ];

    async function onPick(file: File | undefined) {
        if (!file) return;
        setSaved(null);
        const problem = validateAvatarFile(file);
        if (problem) {
            action.fail(problem);
            return;
        }
        const updated = await action.run(async () => api.setAvatar(await fileToAvatar(file)));
        if (updated) {
            updateUser(updated);
            setSaved('Your picture is updated.');
        }
        if (picker.current) picker.current.value = ''; // so choosing the same file again still fires
    }

    function closePasswordForm() {
        setPwOpen(false);
        setCurrentPw('');
        setNewPw('');
        setNewPwAgain('');
        pwAction.clearError();
    }

    async function onPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPwSaved(null);
        const problem = passwordProblem(newPw);
        if (problem) return pwAction.fail(problem);
        if (newPw !== newPwAgain) return pwAction.fail('The two passwords do not match.');
        const updated = await pwAction.run(() =>
            api.changePassword(newPw, user?.has_password ? currentPw : undefined),
        );
        if (updated) {
            updateUser(updated);
            closePasswordForm();
            setPwSaved(
                'Your password is saved. You can now log in with your email and this password.',
            );
        }
    }

    async function onRemove() {
        setSaved(null);
        const updated = await action.run(() => api.removeAvatar());
        if (updated) {
            updateUser(updated);
            setSaved('Your picture is removed.');
        }
    }

    return (
        <>
            <PageHeader title="My profile" subtitle="Your picture, your account and how DocDue keeps you on time." />

            <div className="grid gap-5 lg:grid-cols-5">
                {/* picture + name */}
                <Card className="lg:col-span-5">
                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Avatar name={user?.full_name} src={user?.avatar} className="size-28 text-3xl shadow-md sm:size-32" />
                            <button
                                type="button"
                                aria-label="Change profile picture"
                                disabled={action.busy}
                                onClick={() => picker.current?.click()}
                                className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full bg-brand-700 text-white shadow-md ring-2 ring-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:bg-brand-300"
                            >
                                <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
                                    <circle cx="12" cy="13" r="3.2" />
                                </svg>
                            </button>
                        </div>
                        <div className="min-w-0 text-center sm:text-left">
                            <p className="truncate font-display text-2xl font-bold">{user?.full_name}</p>
                            <p className="truncate text-sm text-ink-600">{user?.email}</p>
                            <p className="mt-1 text-xs text-ink-500">
                                {tenant?.name}
                                {organization ? ` · ${user?.role}` : ' · personal account'}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                                <Button loading={action.busy} onClick={() => picker.current?.click()}>
                                    {user?.avatar ? 'Change picture' : 'Upload a picture'}
                                </Button>
                                {user?.avatar && (
                                    <Button variant="secondary" disabled={action.busy} onClick={() => void onRemove()}>
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-ink-500">JPEG, PNG or WebP. It is cropped to a square.</p>
                        </div>
                        <input
                            ref={picker}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            tabIndex={-1}
                            onChange={(e) => void onPick(e.target.files?.[0])}
                        />
                    </div>
                    {(action.error || saved) && (
                        <div className="mt-4">
                            {action.error ? <Alert kind="error">{action.error}</Alert> : <Alert kind="success">{saved}</Alert>}
                        </div>
                    )}
                </Card>

                <Card className="lg:col-span-3">
                    <h2 className="font-display text-lg font-bold">Account details</h2>
                    <dl className="mt-3 divide-y divide-ink-100 text-sm">
                        {rows.map((row) => (
                            <div key={row.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5">
                                <dt className="text-ink-500">{row.label}</dt>
                                <dd className="min-w-0 break-words text-right font-medium">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>

                <Card className="lg:col-span-2">
                    <h2 className="font-display text-lg font-bold">Your reminders</h2>
                    <p className="mt-1 text-sm text-ink-600">The same five emails for every document.</p>
                    <ol className="relative mt-4 space-y-4 border-l-2 border-dashed border-ink-200 pl-5">
                        {REMINDERS.map((r) => (
                            <li key={r.when} className="relative">
                                <span aria-hidden="true" className={`absolute -left-[1.65rem] top-1 size-3 rounded-full ring-4 ring-white ${r.dot}`} />
                                <p className="text-sm font-semibold">{r.when}</p>
                                <p className="text-xs text-ink-500">{r.note}</p>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-4 text-xs text-ink-500">
                        {organization
                            ? 'The person who uploaded a document and the organization admins get the email, one a day.'
                            : 'Each reminder is sent once. If you change a date, its reminders start again.'}
                    </p>
                </Card>

                <Card className="lg:col-span-5">
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                        <div>
                            <h2 className="font-display text-lg font-bold">Password</h2>
                            {!user?.has_password && (
                                <p className="mt-1 text-sm text-ink-600">
                                    You signed up with Google, so you have no password yet. Set one to log in with your
                                    email too.
                                </p>
                            )}
                        </div>
                        {!pwOpen && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPwSaved(null);
                                    setPwOpen(true);
                                }}
                                className="text-sm font-semibold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 transition hover:text-brand-900 hover:decoration-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
                            >
                                {user?.has_password ? 'Change password' : 'Set a password'}
                            </button>
                        )}
                    </div>

                    {!pwOpen && pwSaved && (
                        <div className="mt-4">
                            <Alert kind="success">{pwSaved}</Alert>
                        </div>
                    )}

                    {pwOpen && (
                        <form
                            onSubmit={(e) => void onPassword(e)}
                            className="mt-5 grid max-w-3xl gap-4 border-t border-dashed border-ink-200 pt-5 sm:grid-cols-2"
                            noValidate
                        >
                            {user?.has_password && (
                                <div className="sm:col-span-2 sm:max-w-sm">
                                    <Field label="Current password" htmlFor="current_password">
                                        <TextInput
                                            id="current_password"
                                            type="password"
                                            autoComplete="current-password"
                                            autoFocus
                                            value={currentPw}
                                            onChange={(e) => setCurrentPw(e.target.value)}
                                        />
                                    </Field>
                                </div>
                            )}
                            <Field label="New password" htmlFor="new_password" hint="At least 8 characters, with a letter and a number.">
                                <TextInput
                                    id="new_password"
                                    type="password"
                                    autoComplete="new-password"
                                    autoFocus={!user?.has_password}
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                />
                            </Field>
                            <Field label="Type it again" htmlFor="new_password_again">
                                <TextInput
                                    id="new_password_again"
                                    type="password"
                                    autoComplete="new-password"
                                    value={newPwAgain}
                                    onChange={(e) => setNewPwAgain(e.target.value)}
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                {pwAction.error && (
                                    <div className="mb-3">
                                        <Alert kind="error">{pwAction.error}</Alert>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        type="submit"
                                        loading={pwAction.busy}
                                        disabled={!newPw || !newPwAgain || (!!user?.has_password && !currentPw)}
                                    >
                                        Save password
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={closePasswordForm}
                                        className="text-sm font-medium text-ink-600 underline underline-offset-4 hover:text-ink-900"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </Card>

                <Card className="lg:col-span-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-display text-lg font-bold">Your privacy</h2>
                            <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-ink-700 sm:grid-cols-2">
                                {PRIVACY.map((line) => (
                                    <li key={line} className="flex items-start gap-2.5">
                                        <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="m4 10.5 4 4 8-9" />
                                        </svg>
                                        {line}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Button variant="secondary" onClick={logout} className="shrink-0 self-start sm:self-center">
                            Log out
                        </Button>
                    </div>
                </Card>
            </div>
        </>
    );
}
