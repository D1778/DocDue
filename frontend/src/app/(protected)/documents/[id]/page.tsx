'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Stamp } from '@/components/brand/Stamp';
import { TypeIcon } from '@/components/brand/TypeIcon';
import type { StampTone } from '@/components/brand/Stamp';
import { Dropdown } from '@/components/Dropdown';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Alert,
  Button,
  Card,
  Field,
  FullPageSpinner,
  Spinner,
  TextInput,
} from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  dateInputLimits,
  datePart,
  expiryText,
  formatDate,
  formatDateTime,
  formatFileSize,
} from '@/lib/format';
import { OCR_LABEL, STATUS_LABEL, TYPE_LABEL, TYPE_OPTIONS } from '@/lib/labels';
import type { DocumentStatus, DocumentType } from '@/lib/types';
import { useAction } from '@/lib/useAction';
import { useResource } from '@/lib/useResource';

type Confirm = 'reprocess' | 'delete' | null;

// Statuses that are shown as a rubber stamp. The others (still reading, upload not finished) keep a plain badge.
const STAMP_TONE: Partial<Record<DocumentStatus, StampTone>> = {
  valid: 'valid',
  expiring: 'expiring',
  expired: 'expired',
  needs_review: 'review',
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? ''); // `?.` keeps TypeScript happy on every Next.js version
  const router = useRouter();
  const { user } = useAuth();

  // Loads the document, and keeps refreshing every 2.5 seconds while OCR is still reading it.
  const doc = useResource(
    `doc:${id}`,
    () => api.getDocument(id),
    (d) => (d.status === 'processing' ? 2500 : null),
  );

  // Drafts hold what the user is typing. null means "nothing typed yet, show the saved value".
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [typeDraft, setTypeDraft] = useState<DocumentType | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dateAction = useAction();
  const detailsAction = useAction();
  const fileAction = useAction();
  const dangerAction = useAction();

  const d = doc.data;

  if (doc.error && !d) {
    const notFound = doc.error.toLowerCase().includes('not found');
    return (
      <div className="space-y-4">
        <Alert kind="error" title={notFound ? 'Document not found' : 'Could not load this document'}>
          {notFound ? 'It may have been deleted, or it belongs to another account.' : doc.error}
        </Alert>
        <Link href="/documents" className="text-sm font-medium text-brand-700 hover:underline">
          Back to your documents
        </Link>
      </div>
    );
  }
  if (!d) return <FullPageSpinner label="Loading the document..." />;

  const canEdit = user?.role === 'admin' || user?.id === d.owner_user_id;
  const limits = dateInputLimits();
  const savedDate = datePart(d.expiry_date) ?? '';
  const dateValue = dateDraft ?? savedDate;
  const titleValue = titleDraft ?? d.title;
  const typeValue = typeDraft ?? d.document_type;
  const processing = d.status === 'processing';
  const suggestedDay = datePart(d.suggested_expiry_date);

  async function saveDate(day: string) {
    setNotice(null);
    const updated = await dateAction.run(() => api.updateDocument(id, { expiry_date: day }));
    if (updated) {
      doc.mutate(updated);
      setDateDraft(null);
      setNotice('Expiry date saved. Reminders will follow the new date.');
    }
  }

  function handleDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dateValue) return;
    if (dateValue < limits.min || dateValue > limits.max) {
      dateAction.fail('That date looks wrong. Check the year.');
      return;
    }
    void saveDate(dateValue);
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = titleValue.trim();
    if (!title) return;
    setNotice(null);
    const updated = await detailsAction.run(() =>
      api.updateDocument(id, { title, document_type: typeValue }),
    );
    if (updated) {
      doc.mutate(updated);
      setTitleDraft(null);
      setTypeDraft(null);
      setNotice('Details saved.');
    }
  }

  async function openFile(download: boolean) {
    // Open the new tab right now (inside the click) so the browser does not block it as a pop-up.
    const popup = download ? null : window.open('', '_blank');
    const result = await fileAction.run(() => api.viewUrl(id, download));
    if (!result) {
      popup?.close();
      return;
    }
    if (download) {
      window.location.assign(result.url);
    } else if (popup) {
      popup.opener = null; // the opened page must not be able to control this one
      popup.location.href = result.url;
    } else {
      window.open(result.url, '_blank', 'noopener');
    }
  }

  async function reprocess() {
    setNotice(null);
    const updated = await dangerAction.run(() => api.reprocessDocument(id));
    if (updated) {
      doc.mutate(updated);
      setDateDraft(null);
      setConfirm(null);
      setNotice('Reading the document again...');
    }
  }

  async function remove() {
    const done = await dangerAction.run(async () => {
      try {
        await api.deleteDocument(id);
      } catch (err) {
        // Already gone? Then the goal is reached anyway.
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      return true;
    });
    if (done) router.replace('/documents');
  }

  return (
    <div className="space-y-5">
      <Link href="/documents" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to your documents
      </Link>

      <div className="relative overflow-hidden rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-ink-200 backdrop-blur-sm sm:p-6">
        <span aria-hidden="true" className="pat-dots absolute inset-y-0 right-0 w-1/2 opacity-60 [mask-image:linear-gradient(to_left,#000,transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:size-14">
              <TypeIcon type={d.document_type} className="size-7" />
            </span>
            <div className="min-w-0">
              <h1 className="break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">{d.title}</h1>
              <p className="mt-1 text-sm text-ink-600">
                {TYPE_LABEL[d.document_type]}
                {d.original_filename ? ` · ${d.original_filename}` : ''}
                {d.file_size ? ` · ${formatFileSize(d.file_size)}` : ''}
              </p>
              {d.expiry_date && (
                <p className="mt-3 inline-flex flex-wrap items-center gap-x-2 rounded-lg bg-ink-50 px-3 py-1.5 text-sm ring-1 ring-ink-100">
                  <span className="text-ink-500">Expires</span>
                  <span className="font-stamp text-ink-900">{formatDate(d.expiry_date)}</span>
                  <span className="text-ink-600">· {expiryText(d.expiry_date)}</span>
                </p>
              )}
            </div>
          </div>
          {STAMP_TONE[d.status] ? (
            <Stamp tone={STAMP_TONE[d.status] as StampTone} rotate={-4}>
              {STATUS_LABEL[d.status]}
            </Stamp>
          ) : (
            <StatusBadge status={d.status} />
          )}
        </div>
      </div>

      {doc.error && <Alert kind="error">{doc.error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {processing && (
        <Alert kind="info">
          <span className="flex items-center gap-2">
            <Spinner /> DocDue is reading your document. This usually takes a few seconds. This page
            updates by itself.
          </span>
        </Alert>
      )}

      {d.status === 'needs_review' && (
        <Alert kind="warning" title="Please check the expiry date">
          {suggestedDay ? (
            <>
              We found <strong>{formatDate(d.suggested_expiry_date)}</strong> but we are only{' '}
              {Math.round((d.ocr_confidence ?? 0) * 100)}% sure. Use it if it is right, or type the
              correct date below.
            </>
          ) : (
            <>We could not find an expiry date we trust. Please type it below.</>
          )}
          {canEdit && suggestedDay && (
            <div className="mt-3">
              <Button loading={dateAction.busy} onClick={() => void saveDate(suggestedDay)}>
                Use {formatDate(d.suggested_expiry_date)}
              </Button>
            </div>
          )}
        </Alert>
      )}

      {/* Expiry date */}
      <Card>
        <h2 className="font-display text-lg font-bold">Expiry date</h2>
        <p className="mt-2 font-display text-4xl font-bold tracking-tight">
          {d.expiry_date ? formatDate(d.expiry_date) : 'Not set'}
        </p>
        {d.expiry_date && <p className="text-sm text-ink-600">{expiryText(d.expiry_date)}</p>}
        <p className="mt-1 text-xs text-ink-500">
          {OCR_LABEL[d.ocr_status]}
          {d.ocr_status === 'auto_detected' && d.ocr_confidence !== null
            ? ` (${Math.round(d.ocr_confidence * 100)}% sure)`
            : ''}
        </p>

        {canEdit ? (
          <form onSubmit={handleDateSubmit} className="mt-4 space-y-3" noValidate>
            {dateAction.error && <Alert kind="error">{dateAction.error}</Alert>}
            <Field
              label={d.expiry_date ? 'Change the expiry date' : 'Set the expiry date'}
              htmlFor="expiry"
              hint="A date you enter always replaces the one found automatically."
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-48">
                  <TextInput
                    id="expiry"
                    type="date"
                    min={limits.min}
                    max={limits.max}
                    disabled={processing}
                    value={dateValue}
                    onChange={(e) => setDateDraft(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  loading={dateAction.busy}
                  disabled={processing || !dateValue || dateValue === savedDate}
                >
                  Save date
                </Button>
              </div>
            </Field>
          </form>
        ) : (
          <p className="mt-4 text-sm text-ink-500">
            Only the person who uploaded this document, or an admin, can change it.
          </p>
        )}
      </Card>

      {/* File */}
      <Card>
        <h2 className="font-display text-lg font-bold">File</h2>
        {fileAction.error && (
          <div className="mt-3">
            <Alert kind="error">{fileAction.error}</Alert>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="secondary" disabled={fileAction.busy || processing} onClick={() => void openFile(false)}>
            View file
          </Button>
          <Button variant="secondary" disabled={fileAction.busy || processing} onClick={() => void openFile(true)}>
            Download
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-500">
          The link works for a few minutes only, so it stays private.
        </p>
      </Card>

      {/* Details */}
      <Card>
        <h2 className="font-display text-lg font-bold">Details</h2>
        {canEdit ? (
          <form onSubmit={handleDetailsSubmit} className="mt-3 space-y-4">
            {detailsAction.error && <Alert kind="error">{detailsAction.error}</Alert>}
            <Field label="Title" htmlFor="title">
              <TextInput
                id="title"
                maxLength={150}
                value={titleValue}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </Field>
            <Field label="Document type" htmlFor="type">
              <Dropdown
                id="type"
                value={typeValue}
                onChange={setTypeDraft}
                options={TYPE_OPTIONS.map((option) => ({ value: option, label: TYPE_LABEL[option] }))}
              />
            </Field>
            <Button
              type="submit"
              loading={detailsAction.busy}
              disabled={
                !titleValue.trim() || (titleValue.trim() === d.title && typeValue === d.document_type)
              }
            >
              Save details
            </Button>
          </form>
        ) : null}
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-500">Uploaded</dt>
            <dd>{formatDateTime(d.created_at)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Last changed</dt>
            <dd>{formatDateTime(d.updated_at)}</dd>
          </div>
        </dl>
      </Card>

      {/* Danger zone */}
      {canEdit && (
        <Card className="border-red-200">
          <h2 className="font-display text-lg font-bold">More actions</h2>
          {dangerAction.error && (
            <div className="mt-3">
              <Alert kind="error">{dangerAction.error}</Alert>
            </div>
          )}

          {confirm === null && (
            <div className="mt-3 flex flex-wrap gap-3">
              <Button variant="secondary" disabled={processing} onClick={() => setConfirm('reprocess')}>
                Read the document again
              </Button>
              <Button variant="danger" onClick={() => setConfirm('delete')}>
                Delete document
              </Button>
            </div>
          )}

          {confirm === 'reprocess' && (
            <div className="mt-3 space-y-3" role="alertdialog" aria-label="Confirm reading again">
              <p className="text-sm">
                DocDue will read the file again and the current expiry date will be cleared. Continue?
              </p>
              <div className="flex gap-3">
                <Button loading={dangerAction.busy} onClick={() => void reprocess()}>
                  Yes, read again
                </Button>
                <Button variant="secondary" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {confirm === 'delete' && (
            <div className="mt-3 space-y-3" role="alertdialog" aria-label="Confirm delete">
              <p className="text-sm">
                Delete <strong>{d.title}</strong>? The file is removed from storage and this cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="danger" loading={dangerAction.busy} onClick={() => void remove()}>
                  Yes, delete it
                </Button>
                <Button variant="secondary" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}