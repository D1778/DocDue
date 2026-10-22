// Small pure helpers for showing dates and sizes.
//
// Expiry dates are calendar dates stored as midnight UTC, and the backend works out
// "valid / expiring / expired" using the UTC date. So we also work with the UTC date
// here. That way the badge, the "days left" text and the reminder emails always agree,
// and a date never shifts by one day because of the time zone.

import type { DocumentStatus } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-05T00:00:00Z" -> "2026-11-05". Returns null if it does not look like a date. */
export function datePart(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** "2026-11-05T00:00:00Z" -> "05 Nov 2026" */
export function formatDate(iso: string | null | undefined): string {
  const day = datePart(iso);
  if (!day) return '';
  const [year, month, date] = day.split('-');
  return `${date} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/** Today's date in UTC as "YYYY-MM-DD". */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / DAY_MS;
}

/** Whole days from today to the expiry date. 0 = today, negative = already past. */
export function daysLeft(iso: string | null | undefined, today: string = todayUtc()): number | null {
  const day = datePart(iso);
  if (!day) return null;
  return Math.round(dayNumber(day) - dayNumber(today));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "12 days left", "Expires today", "Expired 3 days ago" ... */
export function expiryText(iso: string | null | undefined, today: string = todayUtc()): string {
  const left = daysLeft(iso, today);
  if (left === null) return 'No expiry date';
  if (left === 0) return 'Expires today';
  if (left === 1) return 'Expires tomorrow';
  if (left > 1) return `${plural(left, 'day')} left`;
  if (left === -1) return 'Expired yesterday';
  return `Expired ${plural(-left, 'day')} ago`;
}

/** The short line shown on each document card. */
export function expiryLine(
  status: DocumentStatus,
  iso: string | null | undefined,
  today: string = todayUtc(),
): string {
  if (status === 'pending_upload') return 'Upload not finished';
  if (status === 'processing') return 'Reading the document...';
  if (!datePart(iso)) return 'No expiry date yet';
  return `${formatDate(iso)} · ${expiryText(iso, today)}`;
}

/**
 * How much of the time between upload and expiry has gone, 0 to 100.
 * Used for the little bar on document cards. null when there is no usable expiry date.
 */
export function lifeUsedPercent(
  createdIso: string | null | undefined,
  expiryIso: string | null | undefined,
  today: string = todayUtc(),
): number | null {
  const start = datePart(createdIso);
  const end = datePart(expiryIso);
  if (!start || !end) return null;
  const total = dayNumber(end) - dayNumber(start);
  if (total <= 0) return 100;
  const used = dayNumber(today) - dayNumber(start);
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

/** 1536000 -> "1.5 MB" */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "2026-10-18T07:31:00Z" -> "18 Oct 2026, 1:01 pm" in the viewer's own time zone. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/** The first and last date the backend accepts (1990 up to 50 years from now). */
export function dateInputLimits(now: Date = new Date()): { min: string; max: string } {
  return { min: '1990-01-01', max: `${now.getUTCFullYear() + 50}-12-31` };
}