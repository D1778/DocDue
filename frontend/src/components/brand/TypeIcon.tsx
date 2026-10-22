import type { ReactNode } from 'react';
import type { DocumentType } from '@/lib/types';

// One small icon per document type, drawn in code. They use currentColor so the parent sets the colour.
const PATHS: Record<DocumentType, ReactNode> = {
    license: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <circle cx="9" cy="11" r="2" />
            <path d="M6.5 16c.6-1.6 4.4-1.6 5 0M14 10h4M14 13.5h3" />
        </>
    ),
    certificate: (
        <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M7 8h10M7 11.5h6" />
            <circle cx="16" cy="17" r="2.5" />
            <path d="m14.8 19.2-.8 2.3 2-1 2 1-.8-2.3" />
        </>
    ),
    insurance: (
        <>
            <path d="M12 3 5 6v5.5c0 4.3 2.8 7.6 7 9.5 4.2-1.9 7-5.2 7-9.5V6Z" />
            <path d="m9 12 2.2 2.2L15.5 10" />
        </>
    ),
    id_proof: (
        <>
            <rect x="4" y="3" width="16" height="18" rx="2.5" />
            <circle cx="12" cy="9.5" r="2.5" />
            <path d="M7.5 17c.8-2.4 8.2-2.4 9 0" />
        </>
    ),
    permit: (
        <>
            <path d="M7 3h8l4 4v14H7Z" />
            <path d="M15 3v4h4M10 12h6M10 15.5h6M10 8.5h2" />
        </>
    ),
    contract: (
        <>
            <path d="M6 3h9l3 3v15H6Z" />
            <path d="M9 8h5M9 11.5h6M9 15h3" />
            <path d="m13 18.5 1.5-1.5 2 2" />
        </>
    ),
    other: (
        <>
            <path d="M6 3h8l4 4v14H6Z" />
            <path d="M14 3v4h4M9 12h6M9 16h4" />
        </>
    ),
};

export function TypeIcon({ type, className = 'size-5' }: { type: DocumentType; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {PATHS[type]}
        </svg>
    );
}
