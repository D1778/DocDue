import { describe, expect, it } from 'vitest';
import {
    dateInputLimits,
    datePart,
    daysLeft,
    expiryLine,
    expiryText,
    formatDate,
    formatFileSize,
    todayUtc,
} from './format';

const TODAY = '2026-10-18';

describe('datePart and formatDate', () => {
    it('keeps the calendar date of a UTC timestamp, whatever the time zone', () => {
        expect(datePart('2026-11-05T00:00:00Z')).toBe('2026-11-05');
        expect(datePart('2026-11-05T00:00:00+00:00')).toBe('2026-11-05');
        expect(datePart('2026-11-05')).toBe('2026-11-05');
    });

    it('returns null for missing or broken values', () => {
        expect(datePart(null)).toBeNull();
        expect(datePart(undefined)).toBeNull();
        expect(datePart('')).toBeNull();
        expect(datePart('tomorrow')).toBeNull();
    });

    it('writes dates in a friendly way', () => {
        expect(formatDate('2026-11-05T00:00:00Z')).toBe('05 Nov 2026');
        expect(formatDate('2027-01-31T00:00:00Z')).toBe('31 Jan 2027');
        expect(formatDate(null)).toBe('');
    });
});

describe('todayUtc', () => {
    it('uses the UTC date, not the local one', () => {
        expect(todayUtc(new Date('2026-10-18T23:30:00Z'))).toBe('2026-10-18');
        expect(todayUtc(new Date('2026-10-19T00:10:00Z'))).toBe('2026-10-19');
    });
});

describe('daysLeft', () => {
    it('counts whole days', () => {
        expect(daysLeft('2026-10-18T00:00:00Z', TODAY)).toBe(0);
        expect(daysLeft('2026-10-19T00:00:00Z', TODAY)).toBe(1);
        expect(daysLeft('2026-11-17T00:00:00Z', TODAY)).toBe(30);
        expect(daysLeft('2026-10-17T00:00:00Z', TODAY)).toBe(-1);
    });

    it('works across month ends, year ends and leap days', () => {
        expect(daysLeft('2027-01-01T00:00:00Z', '2026-12-31')).toBe(1);
        expect(daysLeft('2028-03-01T00:00:00Z', '2028-02-28')).toBe(2); // 2028 is a leap year
        expect(daysLeft('2027-03-01T00:00:00Z', '2027-02-28')).toBe(1);
    });

    it('is null without a date', () => {
        expect(daysLeft(null, TODAY)).toBeNull();
    });
});

describe('expiryText', () => {
    it('describes the distance in words', () => {
        expect(expiryText('2026-10-18T00:00:00Z', TODAY)).toBe('Expires today');
        expect(expiryText('2026-10-19T00:00:00Z', TODAY)).toBe('Expires tomorrow');
        expect(expiryText('2026-10-28T00:00:00Z', TODAY)).toBe('10 days left');
        expect(expiryText('2026-10-17T00:00:00Z', TODAY)).toBe('Expired yesterday');
        expect(expiryText('2026-10-08T00:00:00Z', TODAY)).toBe('Expired 10 days ago');
        expect(expiryText(null, TODAY)).toBe('No expiry date');
    });
});

describe('expiryLine', () => {
    it('shows status-specific text when there is no date to show', () => {
        expect(expiryLine('processing', null, TODAY)).toBe('Reading the document...');
        expect(expiryLine('pending_upload', null, TODAY)).toBe('Upload not finished');
        expect(expiryLine('needs_review', null, TODAY)).toBe('No expiry date yet');
    });

    it('shows the date and the distance otherwise', () => {
        expect(expiryLine('expiring', '2026-10-28T00:00:00Z', TODAY)).toBe('28 Oct 2026 · 10 days left');
    });
});

describe('formatFileSize', () => {
    it('uses B, KB and MB', () => {
        expect(formatFileSize(500)).toBe('500 B');
        expect(formatFileSize(2048)).toBe('2 KB');
        expect(formatFileSize(1572864)).toBe('1.5 MB');
        expect(formatFileSize(null)).toBe('');
    });
});

describe('dateInputLimits', () => {
    it('matches what the backend accepts: 1990 up to 50 years ahead', () => {
        expect(dateInputLimits(new Date('2026-10-18T00:00:00Z'))).toEqual({
            min: '1990-01-01',
            max: '2076-12-31',
        });
    });
});