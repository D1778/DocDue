'use client';

import { useState } from 'react';
import { Alert, Button, Card, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { EmailTestResult, JobReport } from '@/lib/types';
import { useAction } from '@/lib/useAction';

const REPORT_ROWS: { key: keyof Omit<JobReport, 'dry_run'>; label: string }[] = [
    { key: 'stuck_reprocessed', label: 'Stuck documents read again' },
    { key: 'orphans_deleted', label: 'Unfinished uploads removed' },
    { key: 'statuses_updated', label: 'Statuses corrected' },
    { key: 'reminders_due', label: 'Reminders due' },
    { key: 'emails_sent', label: 'Emails sent' },
    { key: 'emails_failed', label: 'Emails that failed' },
];

export default function AdminToolsPage() {
    const { isAdmin } = useAuth();

    const emailAction = useAction();
    const jobAction = useAction();
    const [emailResult, setEmailResult] = useState<EmailTestResult | null>(null);
    const [report, setReport] = useState<JobReport | null>(null);
    const [dryRun, setDryRun] = useState(true);

    if (!isAdmin) {
        return (
            <>
                <PageHeader title="Admin tools" />
                <Alert kind="info">Only admins can use these tools.</Alert>
            </>
        );
    }

    async function sendTest() {
        setEmailResult(null);
        const result = await emailAction.run(() => api.sendTestEmail());
        if (result) setEmailResult(result);
    }

    async function runJob() {
        setReport(null);
        const result = await jobAction.run(() => api.runDailyJob(dryRun));
        if (result) setReport(result);
    }

    return (
        <>
            <PageHeader
                title="Admin tools"
                subtitle="Run the daily job by hand and check that email works. These affect your organization only."
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <h2 className="font-display text-lg font-bold">Send a test email</h2>
                    <p className="mt-1 text-sm text-ink-600">
                        Sends one email to your own address, to prove the email settings work.
                    </p>
                    <div className="mt-4 space-y-3">
                        {emailAction.error && <Alert kind="error">{emailAction.error}</Alert>}
                        {emailResult && (
                            <Alert kind="success">
                                {emailResult.mode === 'console'
                                    ? `Console mode: the email was printed in the backend terminal for ${emailResult.sent_to}. Nothing was really sent.`
                                    : `Test email sent to ${emailResult.sent_to}. Check the inbox (and spam).`}
                            </Alert>
                        )}
                        <Button loading={emailAction.busy} onClick={() => void sendTest()}>
                            Send test email
                        </Button>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-display text-lg font-bold">Run the daily job now</h2>
                    <p className="mt-1 text-sm text-ink-600">
                        Updates statuses, removes unfinished uploads and sends reminder emails. It runs by itself
                        every day; use this to test it.
                    </p>
                    <div className="mt-4 space-y-3">
                        <label className="flex items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5 size-4 rounded border-ink-300 text-brand-600"
                                checked={dryRun}
                                onChange={(e) => setDryRun(e.target.checked)}
                            />
                            <span>
                                <strong>Dry run</strong> – only count what would happen. Nothing is changed or sent.
                            </span>
                        </label>
                        {!dryRun && (
                            <Alert kind="warning">
                                This is a real run. Reminder emails will be sent and statuses will be changed.
                            </Alert>
                        )}
                        {jobAction.error && <Alert kind="error">{jobAction.error}</Alert>}
                        <Button loading={jobAction.busy} onClick={() => void runJob()}>
                            {dryRun ? 'Run as dry run' : 'Run for real'}
                        </Button>
                    </div>

                    {report && (
                        <div className="mt-5">
                            <h3 className="mb-2 text-sm font-semibold">
                                Result {report.dry_run ? '(dry run: nothing was changed)' : '(real run)'}
                            </h3>
                            <dl className="divide-y divide-ink-100 rounded-lg ring-1 ring-ink-200">
                                {REPORT_ROWS.map((row) => (
                                    <div key={row.key} className="flex justify-between px-3 py-2 text-sm">
                                        <dt className="text-ink-600">{row.label}</dt>
                                        <dd className="font-medium">{report[row.key]}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}