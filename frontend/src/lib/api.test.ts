import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError, api, messageFromDetail, request, setSessionExpiredHandler } from './api';
import { clearTokens, getTokens, saveTokens } from './storage';

interface Call {
    url: string;
    init: RequestInit;
}

let calls: Call[];
let respond: (call: Call) => Response | Promise<Response>;
const realFetch = globalThis.fetch;

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function header(call: Call, name: string): string | undefined {
    return (call.init.headers as Record<string, string>)[name];
}

beforeEach(() => {
    calls = [];
    clearTokens();
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const call = { url: String(input), init: init ?? {} };
        calls.push(call);
        return respond(call);
    }) as typeof fetch;
});

afterEach(() => {
    globalThis.fetch = realFetch;
    setSessionExpiredHandler(null);
    clearTokens();
});

describe('messageFromDetail', () => {
    it('uses a plain text detail as it is', () => {
        expect(messageFromDetail('Incorrect email or password', 401)).toBe('Incorrect email or password');
    });

    it('turns FastAPI validation problems into one sentence', () => {
        const detail = [
            { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
            { loc: ['body', 'password'], msg: 'Value error, Password must contain a number', type: 'value_error' },
        ];
        expect(messageFromDetail(detail, 422)).toBe(
            'Email: value is not a valid email address Password: Password must contain a number',
        );
    });

    it('does not add a field name for whole-form problems', () => {
        const detail = [{ loc: ['body'], msg: 'Value error, organization_name is required', type: 'value_error' }];
        expect(messageFromDetail(detail, 422)).toBe('organization_name is required');
    });

    it('has friendly fallbacks', () => {
        expect(messageFromDetail(undefined, 500)).toMatch(/server had a problem/);
        expect(messageFromDetail(undefined, 404)).toBe('The request failed (code 404).');
    });
});

describe('request', () => {
    it('sends the access token and JSON body', async () => {
        saveTokens({ access_token: 'abc', refresh_token: 'ref', token_type: 'bearer' });
        respond = () => json({ ok: true });

        await request('/things', { method: 'POST', body: { a: 1 } });

        expect(calls[0].url).toBe('http://localhost:8000/api/v1/things');
        expect(header(calls[0], 'Authorization')).toBe('Bearer abc');
        expect(header(calls[0], 'Content-Type')).toBe('application/json');
        expect(calls[0].init.body).toBe('{"a":1}');
    });

    it('builds query strings and skips empty values', async () => {
        respond = () => json({ items: [], total: 0, skip: 0, limit: 1 });
        await api.listDocuments({ status: 'valid', limit: 1, document_type: undefined });
        expect(calls[0].url).toBe('http://localhost:8000/api/v1/documents?status=valid&limit=1');
    });

    it('sends the login as a form with the email in the username field', async () => {
        respond = () => json({ access_token: 'a', refresh_token: 'r', token_type: 'bearer' });
        await api.login('asha@example.com', 'Secret123');

        expect(header(calls[0], 'Content-Type')).toBe('application/x-www-form-urlencoded');
        expect(header(calls[0], 'Authorization')).toBeUndefined();
        expect(String(calls[0].init.body)).toBe('username=asha%40example.com&password=Secret123');
    });

    it('returns undefined for 204 No Content', async () => {
        respond = () => new Response(null, { status: 204 });
        expect(await api.deleteDocument('1')).toBeUndefined();
    });

    it('throws an ApiError carrying the backend message', async () => {
        respond = () => json({ detail: 'Document not found' }, 404);
        const error = await request('/documents/9').catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).message).toBe('Document not found');
    });

    it('explains clearly when the server cannot be reached', async () => {
        respond = () => {
            throw new TypeError('Failed to fetch');
        };
        const error = (await request('/documents').catch((e: unknown) => e)) as ApiError;
        expect(error.status).toBe(0);
        expect(error.message).toMatch(/Cannot reach the server/);
    });
});

describe('automatic token refresh', () => {
    function startWithOldToken() {
        saveTokens({ access_token: 'old', refresh_token: 'refresh-1', token_type: 'bearer' });
    }

    it('gets new tokens on a 401 and repeats the request once', async () => {
        startWithOldToken();
        respond = (call) => {
            if (call.url.endsWith('/auth/refresh')) {
                return json({ access_token: 'new', refresh_token: 'refresh-2', token_type: 'bearer' });
            }
            return header(call, 'Authorization') === 'Bearer new' ? json({ fine: true }) : json({ detail: 'x' }, 401);
        };

        const result = await request<{ fine: boolean }>('/documents');

        expect(result.fine).toBe(true);
        expect(calls.map((c) => c.url.split('/api/v1')[1])).toEqual(['/documents', '/auth/refresh', '/documents']);
        expect(getTokens()?.access_token).toBe('new');
        expect(getTokens()?.refresh_token).toBe('refresh-2');
    });

    it('refreshes only once when several requests fail at the same time', async () => {
        startWithOldToken();
        respond = (call) => {
            if (call.url.endsWith('/auth/refresh')) {
                return json({ access_token: 'new', refresh_token: 'refresh-2', token_type: 'bearer' });
            }
            return header(call, 'Authorization') === 'Bearer new' ? json({ fine: true }) : json({ detail: 'x' }, 401);
        };

        await Promise.all([request('/documents'), request('/users'), request('/auth/me')]);

        const refreshCalls = calls.filter((c) => c.url.endsWith('/auth/refresh'));
        expect(refreshCalls).toHaveLength(1);
    });

    it('logs the user out when the refresh token is rejected', async () => {
        startWithOldToken();
        let expiredCalled = 0;
        setSessionExpiredHandler(() => {
            expiredCalled += 1;
        });
        respond = () => json({ detail: 'Invalid or expired refresh token' }, 401);

        const error = (await request('/documents').catch((e: unknown) => e)) as ApiError;

        expect(error.status).toBe(401);
        expect(getTokens()).toBeNull();
        expect(expiredCalled).toBe(1);
    });

    it('does not try to refresh a wrong password at login', async () => {
        respond = () => json({ detail: 'Incorrect email or password' }, 401);
        const error = (await api.login('a@b.co', 'bad').catch((e: unknown) => e)) as ApiError;

        expect(error.message).toBe('Incorrect email or password');
        expect(calls).toHaveLength(1);
    });

    it('keeps the tokens when the server is only unreachable', async () => {
        startWithOldToken();
        respond = () => {
            throw new TypeError('Failed to fetch');
        };
        await request('/documents').catch(() => undefined);
        expect(getTokens()?.access_token).toBe('old');
    });
});