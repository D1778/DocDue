'use client';

import { useState } from 'react';
import { EmptyTrayArt } from '@/components/brand/Art';
import { DocumentCard } from '@/components/DocumentCard';
import { Alert, ButtonLink, FullPageSpinner, PageHeader, Pagination } from '@/components/ui';
import { Dropdown } from '@/components/Dropdown';
import { api } from '@/lib/api';
import { STATUS_BAR, STATUS_LABEL, TILE_NUMBER_STYLE, TILE_STATUSES, TYPE_LABEL, TYPE_OPTIONS } from '@/lib/labels';
import type { DocumentStatus, DocumentType } from '@/lib/types';
import { useResource } from '@/lib/useResource';

const PAGE_SIZE = 10;
const POLL_MS = 3000;

type Counts = Record<DocumentStatus, number>;

// One tiny request per status, only to read the "total" from each answer.
async function loadCounts(): Promise<Counts> {
  const results = await Promise.all(
    TILE_STATUSES.map((status) => api.listDocuments({ status, limit: 1 })),
  );
  const counts = {} as Counts;
  TILE_STATUSES.forEach((status, index) => {
    counts[status] = results[index].total;
  });
  return counts;
}

export default function DocumentsPage() {
  const [status, setStatus] = useState<DocumentStatus | ''>('');
  const [type, setType] = useState<DocumentType | ''>('');
  const [page, setPage] = useState(0);

  const list = useResource(
    `list:${status}:${type}:${page}`,
    () =>
      api.listDocuments({
        status: status || undefined,
        document_type: type || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
    // While any document is still being read, check again every few seconds.
    (data) => (data.items.some((item) => item.status === 'processing') ? POLL_MS : null),
  );
  const counts = useResource('counts', loadCounts, (data) => (data.processing > 0 ? POLL_MS : null));

  function chooseStatus(next: DocumentStatus | '') {
    setStatus(next);
    setPage(0);
  }

  function chooseType(next: DocumentType | '') {
    setType(next);
    setPage(0);
  }

  const filtered = status !== '' || type !== '';
  const data = list.data;

  return (
    <>
      <PageHeader
        title="Your documents"
        subtitle="Everything in one place, with its expiry date."
        action={<ButtonLink className="w-full sm:w-auto" href="/documents/new">Upload a document</ButtonLink>}
      />

      {/* Tiles: click one to show only those documents */}
      {/* On mobile (2-col): tiles lay out as [full-width] + [2] + [2] = 5 tiles cleanly */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILE_STATUSES.map((tileStatus, index) => {
          const active = status === tileStatus;
          // First tile spans both columns on mobile so the remaining 4 pair up evenly (2+2).
          // On sm (3-col) and lg (5-col) every tile is 1 column.
          const colSpan = index === 0 ? 'col-span-2 sm:col-span-1' : '';
          return (
            <button
              key={tileStatus}
              type="button"
              aria-pressed={active}
              onClick={() => chooseStatus(active ? '' : tileStatus)}
              className={`lift relative flex min-h-[92px] flex-col justify-between overflow-hidden rounded-2xl p-3 sm:min-h-[104px] sm:p-4 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-brand-600 ${colSpan} ${
                active
                  ? 'bg-brand-50 ring-2 ring-brand-700'
                  : 'bg-white ring-1 ring-ink-200 hover:ring-brand-400'
              }`}
            >
              <span aria-hidden="true" className="absolute -right-4 -top-4 size-14 rounded-full bg-brand-100/70 sm:size-16" />
              <span aria-hidden="true" className="absolute -right-1 top-6 size-7 rounded-full bg-brand-50 sm:size-8" />
              <span className={`block font-display text-3xl font-bold leading-none sm:text-4xl ${TILE_NUMBER_STYLE[tileStatus]}`}>
                {counts.data ? counts.data[tileStatus] : '-'}
              </span>
              <span className="mt-2 block truncate text-xs font-medium text-ink-600 sm:text-sm">{STATUS_LABEL[tileStatus]}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="relative z-20 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Dropdown
          className="w-full sm:w-52"
          label="Filter by type"
          value={type}
          onChange={chooseType}
          options={[
            { value: '', label: 'All types' },
            ...TYPE_OPTIONS.map((option) => ({ value: option, label: TYPE_LABEL[option] })),
          ]}
        />
        <Dropdown
          className="w-full sm:w-56"
          label="Filter by status"
          value={status}
          onChange={chooseStatus}
          options={[
            { value: '', label: 'All statuses' },
            ...TILE_STATUSES.map((option) => ({
              value: option,
              label: STATUS_LABEL[option],
              dot: STATUS_BAR[option],
            })),
          ]}
        />
        {filtered && (
          <button
            type="button"
            className="self-start py-1 text-sm font-medium text-brand-700 hover:underline"
            onClick={() => {
              chooseStatus('');
              chooseType('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {list.error && (
        <div className="mb-4">
          <Alert kind="error" title="Could not load your documents">
            {list.error}
          </Alert>
        </div>
      )}

      {!data && !list.error && <FullPageSpinner label="Loading your documents..." />}

      {data && data.items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-ink-300 bg-white px-6 py-12 text-center">
          <EmptyTrayArt className="mx-auto mb-4 h-28 w-auto" />
          <p className="font-display text-xl font-bold">
            {filtered ? 'No documents match these filters.' : 'You have no documents yet.'}
          </p>
          <p className="mt-1 text-sm text-ink-600">
            {filtered
              ? 'Try removing a filter.'
              : 'Upload a licence, certificate or ID and DocDue will find its expiry date.'}
          </p>
          {!filtered && (
            <div className="mt-4">
              <ButtonLink href="/documents/new">Upload your first document</ButtonLink>
            </div>
          )}
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul
            aria-busy={list.loading}
            className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${list.loading ? 'opacity-60' : ''}`}
          >
          {data.items.map((doc) => (
              <li key={doc.id} className="min-w-0">
                <DocumentCard doc={doc} />
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}