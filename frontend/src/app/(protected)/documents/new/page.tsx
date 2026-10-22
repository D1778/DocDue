'use client';

import { useEffect, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, PageHeader, Spinner, TextInput } from '@/components/ui';
import { Dropdown } from '@/components/Dropdown';
import { formatFileSize } from '@/lib/format';
import { TYPE_LABEL, TYPE_OPTIONS } from '@/lib/labels';
import type { DocumentType } from '@/lib/types';
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_MB, uploadDocument, validateFile } from '@/lib/upload';
import type { UploadStage } from '@/lib/upload';
import { useAction } from '@/lib/useAction';

const STEPS: { stage: UploadStage; label: string }[] = [
  { stage: 'requesting', label: 'Preparing the upload' },
  { stage: 'uploading', label: 'Uploading the file' },
  { stage: 'confirming', label: 'Checking the file' },
];

const LOOKS_FOR = [
  'Expiry',
  'Date of expiry',
  'Valid until',
  'Valid thru',
  'Validity',
  'Valid to',
  'Renew before',
  'Renewal date',
  'Use before',
  'Fitness upto',
  'End date',
  'Due date',
  'Exp.',
];

const TIPS = [
  'Take the photo in good light, with the whole page in view.',
  'Keep the page flat and the text upright.',
  'A PDF with selectable text is read most accurately.',
  'If DocDue is unsure, it asks you instead of guessing.',
];

export default function UploadPage() {
  const router = useRouter();
  const action = useAction();

  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('other');
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [percent, setPercent] = useState(0);

  const uploading = action.busy;

  // Warn before the tab is closed in the middle of an upload.
  useEffect(() => {
    if (!uploading) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);

  function chooseFile(picked: File | null | undefined) {
    if (!picked) return;
    setFile(picked);
    setFileProblem(validateFile(picked));
    action.clearError();
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || fileProblem) return;

    const created = await action.run(() =>
      uploadDocument(file, { title, document_type: type }, (nextStage, nextPercent) => {
        setStage(nextStage);
        if (nextPercent !== undefined) setPercent(nextPercent);
      }),
    );

    if (created) {
      router.push(`/documents/${created.id}`);
    } else {
      setStage(null);
    }
  }

  const stageIndex = stage ? STEPS.findIndex((step) => step.stage === stage) : -1;

  return (
    <>
      <PageHeader
        title="Upload a document"
        subtitle={`PDF, JPEG or PNG, up to ${MAX_UPLOAD_MB} MB. DocDue reads the expiry date for you.`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={handleSubmit} className="space-y-5">
        {action.error && (
          <Alert kind="error" title="The upload did not finish">
            {action.error}
          </Alert>
        )}

        {/* Drop zone: a label around a hidden file input, so keyboard and mouse both work */}
        <label
          htmlFor="file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${
            dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-300 bg-white hover:border-brand-400'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            id="file"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => chooseFile(e.target.files?.[0])}
          />
          {file ? (
            <>
              <span className="font-medium">{file.name}</span>
              <span className="mt-1 text-sm text-ink-500">
                {formatFileSize(file.size)} · click to choose a different file
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">Drop a file here, or click to choose one</span>
              <span className="mt-1 text-sm text-ink-500">PDF, JPEG or PNG</span>
            </>
          )}
        </label>

        {fileProblem && <Alert kind="error">{fileProblem}</Alert>}

        <Card className="space-y-4">
          <Field
            label="Title (optional)"
            htmlFor="title"
            hint="Leave empty to use the file name."
          >
            <TextInput
              id="title"
              maxLength={150}
              disabled={uploading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={file ? file.name.replace(/\.[^.]+$/, '') : 'For example: Trade licence 2026'}
            />
          </Field>

          <Field label="Document type" htmlFor="type">
            <Dropdown
              id="type"
              disabled={uploading}
              value={type}
              onChange={setType}
              options={TYPE_OPTIONS.map((option) => ({ value: option, label: TYPE_LABEL[option] }))}
            />
          </Field>
        </Card>

        {/* Progress, shown only while uploading */}
        {uploading && (
          <Card>
            <ol className="space-y-3" aria-label="Upload progress">
              {STEPS.map((step, index) => {
                const done = index < stageIndex;
                const current = index === stageIndex;
                return (
                  <li key={step.stage} className="flex items-center gap-3 text-sm">
                    <span className="flex size-5 items-center justify-center">
                      {done ? (
                        <span className="text-emerald-600" aria-label="done">
                          ✓
                        </span>
                      ) : current ? (
                        <Spinner className="text-brand-600" />
                      ) : (
                        <span aria-hidden="true" className="size-2 rounded-full bg-ink-300" />
                      )}
                    </span>
                    <span className={current ? 'font-medium' : done ? 'text-ink-500' : 'text-ink-400'}>
                      {step.label}
                      {current && step.stage === 'uploading' ? ` (${percent}%)` : ''}
                    </span>
                  </li>
                );
              })}
            </ol>
            {stage === 'uploading' && (
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-ink-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="h-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} />
              </div>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={uploading} disabled={!file || !!fileProblem}>
            Upload
          </Button>
          <Button variant="secondary" disabled={uploading} onClick={() => router.push('/documents')}>
            Cancel
          </Button>
        </div>
      </form>

      <aside className="space-y-4" aria-label="What DocDue looks for">
        <Card>
          <h2 className="font-display text-lg font-bold">What DocDue looks for</h2>
          <p className="mt-1 text-sm text-ink-600">
            Documents word the expiry date in different ways. DocDue recognises all of these:
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {LOOKS_FOR.map((word) => (
              <li key={word} className="rounded-full bg-brand-50 px-2.5 py-1 font-stamp text-xs text-brand-800 ring-1 ring-inset ring-brand-200">
                {word}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">
            For a range such as 01/04/2026 to 31/03/2027, the end date is used. Issue and birth dates are ignored.
          </p>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">For the best result</h2>
          <ul className="mt-2 space-y-2 text-sm text-ink-700">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" />
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      </aside>
      </div>
    </>
  );
}