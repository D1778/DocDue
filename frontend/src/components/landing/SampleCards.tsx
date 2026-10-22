import { TypeIcon } from '@/components/brand/TypeIcon';
import type { DocumentType } from '@/lib/types';

// Static example cards for the home page. They show what a document looks like inside DocDue
// and how different documents word their expiry date. Nothing here talks to the server.

type Tone = 'valid' | 'expiring' | 'expired';

const TONE: Record<Tone, { stripe: string; tile: string; bar: string; pill: string; label: string }> = {
    valid: {
        stripe: 'border-l-emerald-500',
        tile: 'bg-emerald-50 text-emerald-700',
        bar: 'bg-emerald-500',
        pill: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
        label: 'Valid',
    },
    expiring: {
        stripe: 'border-l-amber-500',
        tile: 'bg-amber-50 text-amber-700',
        bar: 'bg-amber-500',
        pill: 'bg-amber-50 text-amber-900 ring-amber-300',
        label: 'Expiring soon',
    },
    expired: {
        stripe: 'border-l-red-500',
        tile: 'bg-red-50 text-red-700',
        bar: 'bg-red-500',
        pill: 'bg-red-50 text-red-800 ring-red-300',
        label: 'Expired',
    },
};

interface Sample {
    title: string;
    type: DocumentType;
    typeLabel: string;
    date: string;
    note: string;
    used: number;
    tone: Tone;
    file: string;
}

const VAULT: Sample[] = [
    { title: 'Trade licence', type: 'license', typeLabel: 'License', date: '14 Mar 2031', note: '5 years left', used: 12, tone: 'valid', file: 'trade-licence.pdf · 1.2 MB' },
    { title: 'Fire safety certificate', type: 'certificate', typeLabel: 'Certificate', date: '29 Oct 2026', note: '7 days left', used: 94, tone: 'expiring', file: 'fire-noc.jpg · 840 KB' },
    { title: 'Vehicle insurance', type: 'insurance', typeLabel: 'Insurance', date: '03 Feb 2026', note: 'Expired', used: 100, tone: 'expired', file: 'policy.pdf · 2.4 MB' },
];

export function VaultSamples() {
    return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Example document cards">
            {VAULT.map((d) => {
                const t = TONE[d.tone];
                return (
                    <li
                        key={d.title}
                        className={`lift relative flex flex-col overflow-hidden rounded-2xl border-l-4 bg-white p-5 shadow-sm ring-1 ring-ink-200 ${t.stripe}`}
                    >
                        <span aria-hidden="true" className="absolute right-0 top-0 size-7 bg-gradient-to-bl from-ink-200 via-ink-100 to-transparent [clip-path:polygon(100%_0,0_0,100%_100%)]" />
                        <div className="flex items-start gap-3 pr-6">
                            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
                                <TypeIcon type={d.type} className="size-6" />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate font-display text-lg font-bold leading-tight">{d.title}</p>
                                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-500">{d.typeLabel}</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Expiry date</p>
                                    <p className="mt-0.5 font-stamp text-base">{d.date}</p>
                                </div>
                                <span className="text-right font-display text-sm font-bold text-ink-800">{d.note}</span>
                            </div>
                            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-200">
                                <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${d.used}%` }} />
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${t.pill}`}>
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                                {t.label}
                            </span>
                            <span className="text-xs text-ink-500">Found automatically</span>
                        </div>
                        <p className="mt-3 truncate border-t border-dashed border-ink-200 pt-3 text-xs text-ink-500">{d.file}</p>
                    </li>
                );
            })}
        </ul>
    );
}

// ---------- the many words for "expiry date" ----------

interface Wording {
    doc: string;
    type: DocumentType;
    printed: string; // the words printed on the document
    value: string;
}

const WORDINGS: Wording[] = [
    { doc: 'Passport', type: 'id_proof', printed: 'Date of expiry', value: '04 Mar 2028' },
    { doc: 'Driving licence', type: 'license', printed: 'Validity (NT)', value: '12 Mar 2035' },
    { doc: 'Food licence', type: 'license', printed: 'Valid until', value: '15 Mar 2031' },
    { doc: 'Vehicle insurance', type: 'insurance', printed: 'Period of insurance 01/04/2026 to', value: '31 Mar 2027' },
    { doc: 'Fire safety NOC', type: 'certificate', printed: 'Renew before', value: '30 Jun 2027' },
    { doc: 'Vehicle fitness', type: 'permit', printed: 'Fitness upto', value: '31 Dec 2030' },
    { doc: 'Rental contract', type: 'contract', printed: 'End date', value: '28 Feb 2027' },
    { doc: 'Medicine strip', type: 'other', printed: 'Exp.', value: '09 Sep 2032' },
];

const MORE_WORDS = [
    'Expires on',
    'Valid thru',
    'Valid till',
    'Valid to',
    'Good through',
    'Use before',
    'Best before',
    'Renewal date',
    'Next due',
    'Due date',
    'Policy end date',
    'Date of validity',
    'Not valid after',
    'DOE',
];

export function ExpiryWordings() {
    return (
        <div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Examples of how documents word their expiry date">
                {WORDINGS.map((w) => (
                    <li key={w.doc} className="lift flex flex-col rounded-2xl bg-white p-4 ring-1 ring-ink-200">
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                <TypeIcon type={w.type} className="size-5" />
                            </span>
                            <p className="font-display font-bold">{w.doc}</p>
                        </div>
                        <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-ink-500">Printed on it</p>
                        <p className="mt-1 font-stamp text-sm text-ink-700">
                            {w.printed}{' '}
                            <mark className="rounded-[3px] bg-amber-300/70 px-1 text-ink-950">{w.value}</mark>
                        </p>
                        <div className="mt-auto flex items-center gap-2 pt-4 text-xs font-medium text-brand-800">
                            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 8h10M9 4l4 4-4 4" />
                            </svg>
                            DocDue reads it as the expiry date
                        </div>
                    </li>
                ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-medium text-ink-600">Also understands:</span>
                {MORE_WORDS.map((word) => (
                    <span key={word} className="rounded-full bg-brand-50 px-3 py-1 font-stamp text-xs text-brand-800 ring-1 ring-inset ring-brand-200">
                        {word}
                    </span>
                ))}
            </div>
        </div>
    );
}
