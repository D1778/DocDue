'use client';

import { Button, Card, PageHeader } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

export default function SettingsPage() {
    const { user, tenant, logout } = useAuth();

    const rows = [
        { label: 'Name', value: user?.full_name },
        { label: 'Email', value: user?.email },
        { label: 'Role', value: user?.role === 'admin' ? 'Admin' : 'Member' },
        {
            label: 'Account',
            value: `${tenant?.name} (${tenant?.account_type === 'organization' ? 'organization' : 'personal'})`,
        },
        { label: 'Member since', value: formatDateTime(user?.created_at) },
        { label: 'Last login', value: user?.last_login_at ? formatDateTime(user.last_login_at) : 'Just now' },
    ];

    return (
        <>
            <PageHeader title="Settings" subtitle="Your account, and how DocDue reminds you." />

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <h2 className="text-base font-semibold">Your account</h2>
                    <dl className="mt-3 divide-y divide-slate-100 text-sm">
                        {rows.map((row) => (
                            <div key={row.label} className="flex justify-between gap-4 py-2">
                                <dt className="text-slate-500">{row.label}</dt>
                                <dd className="text-right font-medium">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>

                <Card>
                    <h2 className="text-base font-semibold">How reminders work</h2>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                        <li>
                            Once a day DocDue checks every document. By default it sends a reminder 30, 14, 7 and 1
                            days before the expiry date, and on the expiry day itself.
                        </li>
                        <li>
                            The email goes to the person who uploaded the document and to every admin of the
                            organization.
                        </li>
                        <li>Each person gets one email a day that lists everything needing attention.</li>
                        <li>
                            The same reminder is never sent twice. If you change a document&apos;s expiry date, its
                            reminders start again from the new date.
                        </li>
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">
                        Choosing your own reminder days is not available yet.
                    </p>
                </Card>

                <Card className="lg:col-span-2">
                    <h2 className="text-base font-semibold">This browser</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Connected to the DocDue server at <code className="rounded bg-slate-100 px-1.5 py-0.5">{API_URL}</code>
                    </p>
                    <div className="mt-4">
                        <Button variant="secondary" onClick={logout}>
                            Log out
                        </Button>
                    </div>
                </Card>
            </div>
        </>
    );
}