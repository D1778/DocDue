// The one place that talks to the DocDue backend.
// Every page calls these functions instead of using fetch directly.

import { clearTokens, getTokens, saveTokens } from './storage';
import type {
    DocumentItem,
    DocumentList,
    DocumentStatus,
    DocumentType,
    DocumentUpdate,
    MeResponse,
    NewMemberInput,
    RegisterInput,
    RegisterResponse,
    Tokens,
    UploadSlot,
    User,
    ViewUrl,
} from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1').replace(
    /\/+$/,
    '',
);

// ---------- errors ----------

export class ApiError extends Error {
    readonly status: number; // 0 means "the server could not be reached at all"

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

function prettyField(name: string): string {
    const text = name.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Turn FastAPI's `detail` (a string, or a list of validation problems) into one readable sentence. */
export function messageFromDetail(detail: unknown, status: number): string {
    if (typeof detail === 'string' && detail.trim()) {
        const lower = detail.toLowerCase();
        if (status >= 500 || lower.includes('internal server') || lower.includes('traceback') || lower.includes('exception')) {
            return 'We encountered a temporary issue on our side. Please try again in a moment.';
        }
        if (detail === 'Not Found' && status === 404) {
            return 'The requested item could not be found.';
        }
        return detail;
    }

    if (Array.isArray(detail)) {
        const parts: string[] = [];
        for (const item of detail) {
            if (typeof item === 'string') {
                parts.push(item);
            } else if (item && typeof item === 'object') {
                const { loc, msg } = item as { loc?: unknown; msg?: unknown };
                if (typeof msg !== 'string') continue;
                const text = msg.replace(/^Value error,\s*/i, '');
                const field = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
                const named = typeof field === 'string' && !['body', 'query', 'path'].includes(field);
                parts.push(named ? `${prettyField(field)}: ${text}` : text);
            }
        }
        if (parts.length > 0) return parts.join(' ');
    }

    if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
    return 'Something went wrong. Please try again.';
}

export function errorMessage(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    return 'Something went wrong. Please try again.';
}

async function toApiError(res: Response): Promise<ApiError> {
    let detail: unknown = null;
    try {
        const data = (await res.json()) as { detail?: unknown };
        detail = data?.detail;
    } catch {
        // The body was not JSON: fall back to a generic message.
    }
    return new ApiError(res.status, messageFromDetail(detail, res.status));
}

// ---------- the core request function ----------

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
    method?: string;
    body?: unknown; // sent as JSON
    form?: URLSearchParams; // sent as a form (only the login endpoint needs this)
    query?: Record<string, QueryValue>;
    auth?: boolean; // false for login, register and refresh
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    const text = params.toString();
    return `${API_URL}${path}${text ? `?${text}` : ''}`;
}

async function send(path: string, opts: RequestOptions, token?: string): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    let body: BodyInit | undefined;
    if (opts.form) {
        body = opts.form;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (opts.body !== undefined) {
        body = JSON.stringify(opts.body);
        headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        return await fetch(buildUrl(path, opts.query), { method: opts.method ?? 'GET', headers, body });
    } catch {
        throw new ApiError(
            0,
            "We can't connect right now. Please check your internet connection and try again.",
        );
    }
}

// If several requests fail with 401 at the same moment, only ONE refresh call is made.
let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
    const current = getTokens();
    if (!current) return false;
    const res = await send('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: current.refresh_token },
    });
    if (res.status === 401) {
        clearTokens(); // the refresh token is no longer valid: the user must log in again
        return false;
    }
    if (!res.ok) throw await toApiError(res);
    saveTokens((await res.json()) as Tokens);
    return true;
}

function refreshTokens(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = doRefresh().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}

// The login state registers a function here so it can react when the session is lost.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null): void {
    onSessionExpired = handler;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const useAuth = opts.auth !== false;
    const usedToken = useAuth ? getTokens()?.access_token : undefined;
    let res = await send(path, opts, usedToken);

    if (res.status === 401 && useAuth) {
        // The access token probably expired. Get a new one and try the request once more.
        // (If another request already got a new token while this one was waiting, just reuse it.)
        const alreadyRenewed = !!getTokens() && getTokens()?.access_token !== usedToken;
        const refreshed = alreadyRenewed || (getTokens() ? await refreshTokens() : false);
        if (refreshed) res = await send(path, opts, getTokens()?.access_token);
        if (res.status === 401) {
            clearTokens();
            onSessionExpired?.();
        }
    }

    if (!res.ok) throw await toApiError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

// ---------- one function per backend endpoint ----------

export interface ListParams {
    status?: DocumentStatus;
    document_type?: DocumentType;
    skip?: number;
    limit?: number;
}

export interface UploadRequest {
    filename: string;
    content_type: string;
    file_size: number;
    document_type: DocumentType;
    title?: string;
}

export const api = {
    // auth
    login: (email: string, password: string) =>
        request<Tokens>('/auth/login', {
            method: 'POST',
            auth: false,
            form: new URLSearchParams({ username: email, password }),
        }),
    register: (input: RegisterInput) =>
        request<RegisterResponse>('/auth/register', { method: 'POST', auth: false, body: input }),
    me: () => request<MeResponse>('/auth/me'),
    googleLogin: (credential: string) =>
        request<Tokens>('/auth/google', { method: 'POST', auth: false, body: { credential } }),
    forgotPassword: (email: string) =>
        request<{ detail: string }>('/auth/forgot-password', { method: 'POST', auth: false, body: { email } }),
    resetPassword: (token: string, newPassword: string) =>
        request<{ detail: string }>('/auth/reset-password', {
            method: 'POST',
            auth: false,
            body: { token, new_password: newPassword },
        }),
    changePassword: (newPassword: string, currentPassword?: string) =>
        request<User>('/auth/me/password', {
            method: 'PUT',
            body: { new_password: newPassword, current_password: currentPassword },
        }),
    setAvatar: (avatar: string) => request<User>('/auth/me/avatar', { method: 'PUT', body: { avatar } }),
    removeAvatar: () => request<User>('/auth/me/avatar', { method: 'DELETE' }),

    // documents
    listDocuments: (params: ListParams = {}) =>
        request<DocumentList>('/documents', { query: { ...params } }),
    getDocument: (id: string) => request<DocumentItem>(`/documents/${id}`),
    updateDocument: (id: string, patch: DocumentUpdate) =>
        request<DocumentItem>(`/documents/${id}`, { method: 'PATCH', body: patch }),
    deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
    reprocessDocument: (id: string) =>
        request<DocumentItem>(`/documents/${id}/reprocess`, { method: 'POST' }),
    viewUrl: (id: string, download = false) =>
        request<ViewUrl>(`/documents/${id}/view-url`, { query: { download } }),
    requestUpload: (body: UploadRequest) =>
        request<UploadSlot>('/documents/upload-url', { method: 'POST', body }),
    completeUpload: (id: string) =>
        request<DocumentItem>(`/documents/${id}/complete`, { method: 'POST' }),

    // team (admins of organizations)
    listUsers: () => request<User[]>('/users'),
    createUser: (input: NewMemberInput) => request<User>('/users', { method: 'POST', body: input }),
};