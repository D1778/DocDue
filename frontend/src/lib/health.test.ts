import { describe, expect, it } from 'vitest';
import { healthUrl } from './health';

describe('healthUrl', () => {
    it('replaces the API path with /health', () => {
        expect(healthUrl('https://docdue-api.onrender.com/api/v1')).toBe(
            'https://docdue-api.onrender.com/health',
        );
    });

    it('works for the local backend', () => {
        expect(healthUrl('http://localhost:8000/api/v1')).toBe('http://localhost:8000/health');
    });

    it('ignores a trailing slash', () => {
        expect(healthUrl('https://x.example.com/api/v1/')).toBe('https://x.example.com/health');
    });

    it('returns an empty string for something that is not a web address', () => {
        expect(healthUrl('')).toBe('');
        expect(healthUrl('not a url')).toBe('');
    });
});