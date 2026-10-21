import { describe, expect, it } from 'vitest';
import { ALLOWED_TYPES, MAX_UPLOAD_MB, validateFile } from './upload';
import { emailLooksValid, passwordProblem } from './validation';

describe('passwordProblem', () => {
    it('accepts a password with letters and numbers', () => {
        expect(passwordProblem('Strong123')).toBeNull();
    });

    it('rejects short passwords', () => {
        expect(passwordProblem('abc123')).toMatch(/at least 8/);
    });

    it('needs a letter and a number', () => {
        expect(passwordProblem('onlyletters')).toMatch(/letter and one number/);
        expect(passwordProblem('12345678')).toMatch(/letter and one number/);
    });

    it('counts bytes like the backend (72 byte limit)', () => {
        expect(passwordProblem('a1'.repeat(36))).toBeNull(); // exactly 72
        expect(passwordProblem('a1'.repeat(37))).toMatch(/at most 72/);
        expect(passwordProblem('é1'.repeat(30))).toMatch(/at most 72/); // 30 x 3 bytes = 90
    });
});

describe('emailLooksValid', () => {
    it('accepts normal addresses and rejects obvious mistakes', () => {
        expect(emailLooksValid('asha@example.com')).toBe(true);
        expect(emailLooksValid('  asha@example.com ')).toBe(true);
        expect(emailLooksValid('asha@example')).toBe(false);
        expect(emailLooksValid('asha example@x.com')).toBe(false);
        expect(emailLooksValid('')).toBe(false);
    });
});

describe('validateFile', () => {
    const MB = 1024 * 1024;

    it('accepts PDF, JPEG and PNG within the limit', () => {
        for (const type of ALLOWED_TYPES) {
            expect(validateFile({ name: 'a', type, size: 1000 })).toBeNull();
        }
    });

    it('rejects other types', () => {
        expect(validateFile({ name: 'a.exe', type: 'application/x-msdownload', size: 1000 })).toMatch(
            /PDF, JPEG and PNG/,
        );
        expect(validateFile({ name: 'a.doc', type: '', size: 1000 })).toMatch(/PDF, JPEG and PNG/);
    });

    it('rejects empty and oversized files', () => {
        expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toMatch(/empty/);
        const tooBig = validateFile({ name: 'a.pdf', type: 'application/pdf', size: (MAX_UPLOAD_MB + 1) * MB });
        expect(tooBig).toMatch(/too large/);
        expect(tooBig).toContain(`${MAX_UPLOAD_MB} MB`);
    });

    it('accepts a file exactly at the limit', () => {
        expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_UPLOAD_MB * MB })).toBeNull();
    });
});