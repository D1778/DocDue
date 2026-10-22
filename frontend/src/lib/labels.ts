// The words and colours used for statuses and document types.
// Each status has a text label too, so the page never relies on colour alone.

import type { DocumentStatus, DocumentType, OcrStatus } from './types';

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending_upload: 'Upload not finished',
  processing: 'Reading...',
  needs_review: 'Needs review',
  valid: 'Valid',
  expiring: 'Expiring soon',
  expired: 'Expired',
};

// Full class names written out, so Tailwind can find them.
export const STATUS_STYLE: Record<DocumentStatus, string> = {
  pending_upload: 'bg-ink-100 text-ink-700 ring-ink-300',
  processing: 'bg-sky-50 text-sky-800 ring-sky-300',
  needs_review: 'bg-violet-50 text-violet-800 ring-violet-300',
  valid: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  expiring: 'bg-amber-50 text-amber-900 ring-amber-300',
  expired: 'bg-red-50 text-red-800 ring-red-300',
};

export const TYPE_LABEL: Record<DocumentType, string> = {
  license: 'License',
  certificate: 'Certificate',
  insurance: 'Insurance',
  id_proof: 'ID proof',
  permit: 'Permit',
  contract: 'Contract',
  other: 'Other',
};

export const TYPE_OPTIONS: DocumentType[] = [
  'license',
  'certificate',
  'insurance',
  'id_proof',
  'permit',
  'contract',
  'other',
];

// The statuses shown as tiles on the dashboard, most urgent first.
export const TILE_STATUSES: DocumentStatus[] = [
  'expired',
  'expiring',
  'needs_review',
  'valid',
  'processing',
];

// Colour of the big number on each dashboard tile.
export const TILE_NUMBER_STYLE: Record<DocumentStatus, string> = {
  pending_upload: 'text-ink-700',
  processing: 'text-sky-700',
  needs_review: 'text-violet-700',
  valid: 'text-emerald-700',
  expiring: 'text-amber-700',
  expired: 'text-red-700',
};

// How the date on a document was found.
export const OCR_LABEL: Record<OcrStatus, string> = {
  pending: 'Waiting to be read',
  auto_detected: 'Found automatically',
  needs_review: 'Could not be read with confidence',
  manually_set: 'Entered by a person',
};

// The coloured stripe on the left edge of a document card.
export const STATUS_STRIPE: Record<DocumentStatus, string> = {
  pending_upload: 'border-l-ink-300',
  processing: 'border-l-sky-400',
  needs_review: 'border-l-violet-500',
  valid: 'border-l-emerald-500',
  expiring: 'border-l-amber-500',
  expired: 'border-l-red-500',
};