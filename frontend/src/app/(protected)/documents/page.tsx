'use client';

import { useState } from 'react';
import { DocumentCard } from '@/components/DocumentCard';
import { Alert, ButtonLink, FullPageSpinner, PageHeader, Pagination, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { STATUS_LABEL, TILE_NUMBER_STYLE, TILE_STATUSES, TYPE_LABEL, TYPE_OPTIONS } from '@/lib/labels';
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
        action={<ButtonLink href="/documents/new">Upload a document</ButtonLink>}
      />

      {/* Tiles: click one to show only those documents */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILE_STATUSES.map((tileStatus) => {
          const active = status === tileStatus;
          return (
            <button
              key={tileStatus}
              type="button"
              aria-pressed={active}
              onClick={() => chooseStatus(active ? '' : tileStatus)}
              className={`rounded-xl p-4 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                active
                  ? 'bg-indigo-50 ring-2 ring-indigo-600'
                  : 'bg-white ring-1 ring-slate-200 hover:ring-indigo-300'
              }`}
            >
              <span className={`block text-2xl font-semibold ${TILE_NUMBER_STYLE[tileStatus]}`}>
                {counts.data ? counts.data[tileStatus] : '-'}
              </span>
              <span className="block text-sm text-slate-600">{STATUS_LABEL[tileStatus]}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-44">
          <Select
            aria-label="Filter by type"
            value={type}
            onChange={(e) => chooseType(e.target.value as DocumentType | '')}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {TYPE_LABEL[option]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => chooseStatus(e.target.value as DocumentStatus | '')}
          >
            <option value="">All statuses</option>
            {TILE_STATUSES.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABEL[option]}
              </option>
            ))}
          </Select>
        </div>
        {filtered && (
          <button
            type="button"
            className="text-sm font-medium text-indigo-700 hover:underline"
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
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-medium">
            {filtered ? 'No documents match these filters.' : 'You have no documents yet.'}
          </p>
          <p className="mt-1 text-sm text-slate-600">
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
          <ul aria-busy={list.loading} className={`space-y-3 ${list.loading ? 'opacity-60' : ''}`}>
            {data.items.map((doc) => (
              <li key={doc.id}>
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