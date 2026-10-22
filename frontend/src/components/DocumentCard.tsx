import Link from 'next/link';
import { daysLeft, expiryText, formatDate, formatFileSize, lifeUsedPercent } from '@/lib/format';
import { OCR_LABEL, STATUS_BAR, STATUS_STRIPE, STATUS_TILE, TYPE_LABEL } from '@/lib/labels';
import type { DocumentItem } from '@/lib/types';
import { TypeIcon } from './brand/TypeIcon';
import { StatusBadge } from './StatusBadge';

// One document as a card: what it is, when it expires, how much time is used up, and how the
// date was found. The whole card is a link to the detail page.
export function DocumentCard({ doc }: { doc: DocumentItem }) {
    const hasDate = doc.status !== 'pending_upload' && doc.status !== 'processing' && !!doc.expiry_date;
    const used = hasDate ? lifeUsedPercent(doc.created_at, doc.expiry_date) : null;
    const left = hasDate ? daysLeft(doc.expiry_date) : null;

    return (
        <Link
            href={`/documents/${doc.id}`}
            className={`lift group relative flex h-full flex-col overflow-hidden rounded-2xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-ink-200 hover:ring-brand-400 focus-visible:outline-2 focus-visible:outline-brand-600 sm:p-5 ${STATUS_STRIPE[doc.status]}`}
        >
            {/* paper corner fold */}
            <span aria-hidden="true" className="absolute right-0 top-0 size-7 bg-gradient-to-bl from-ink-200 via-ink-100 to-transparent [clip-path:polygon(100%_0,0_0,100%_100%)]" />

            <div className="flex items-start gap-3 pr-6">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${STATUS_TILE[doc.status]}`}>
                    <TypeIcon type={doc.document_type} className="size-6" />
                </span>
                <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold leading-tight group-hover:text-brand-800">{doc.title}</p>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-500">
                        {TYPE_LABEL[doc.document_type]}
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">Expiry date</p>
                        <p className="mt-0.5 truncate font-stamp text-base text-ink-900">
                            {hasDate
                                ? formatDate(doc.expiry_date)
                                : doc.status === 'processing'
                                  ? 'Reading...'
                                  : doc.suggested_expiry_date
                                    ? `Maybe ${formatDate(doc.suggested_expiry_date)}`
                                    : 'Not set yet'}
                        </p>
                    </div>
                    {hasDate && (
                        <span className="shrink-0 text-right font-display text-sm font-bold text-ink-800">
                            {left !== null && left > 1 ? (
                                <>
                                    <span className="text-2xl leading-none">{left}</span> days
                                </>
                            ) : (
                                expiryText(doc.expiry_date)
                            )}
                        </span>
                    )}
                </div>
                {used !== null && (
                    <div
                        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-200"
                        role="img"
                        aria-label={`${used}% of the time until expiry has passed`}
                    >
                        <div className={`h-full rounded-full ${STATUS_BAR[doc.status]}`} style={{ width: `${used}%` }} />
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={doc.status} />
                <span className="text-xs text-ink-500">{OCR_LABEL[doc.ocr_status]}</span>
            </div>

            {(doc.original_filename || doc.file_size) && (
                <p className="mt-3 truncate border-t border-dashed border-ink-200 pt-3 text-xs text-ink-500">
                    {[doc.original_filename, doc.file_size ? formatFileSize(doc.file_size) : null]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            )}
        </Link>
    );
}
