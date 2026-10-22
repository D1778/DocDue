import Link from 'next/link';
import { expiryLine, formatFileSize } from '@/lib/format';
import { TYPE_LABEL } from '@/lib/labels';
import type { DocumentItem } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function DocumentCard({ doc }: { doc: DocumentItem }) {
    const meta = [
        TYPE_LABEL[doc.document_type],
        doc.original_filename,
        doc.file_size ? formatFileSize(doc.file_size) : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Link
            href={`/documents/${doc.id}`}
            className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-ink-200 transition hover:ring-brand-400 focus-visible:outline-2 focus-visible:outline-brand-600 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="min-w-0">
                <p className="truncate font-medium">{doc.title}</p>
                <p className="mt-0.5 truncate text-sm text-ink-500">{meta}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
                <StatusBadge status={doc.status} />
                <span className="text-sm text-ink-600">{expiryLine(doc.status, doc.expiry_date)}</span>
            </div>
        </Link>
    );
}