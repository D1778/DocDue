import { STATUS_LABEL, STATUS_STYLE } from '@/lib/labels';
import type { DocumentStatus } from '@/lib/types';
import { Spinner } from './ui';

export function StatusBadge({ status }: { status: DocumentStatus }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}
        >
            {status === 'processing' ? (
                <Spinner className="size-3" />
            ) : (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            )}
            {STATUS_LABEL[status]}
        </span>
    );
}