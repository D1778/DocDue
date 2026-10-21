// These types describe the JSON the DocDue backend sends and expects.
// They mirror the Pydantic schemas from Sprints 1 to 4.

export type Role = 'admin' | 'member';
export type AccountType = 'personal' | 'organization';

export type DocumentStatus =
    | 'pending_upload'
    | 'processing'
    | 'needs_review'
    | 'valid'
    | 'expiring'
    | 'expired';

export type DocumentType =
    | 'license'
    | 'certificate'
    | 'insurance'
    | 'id_proof'
    | 'permit'
    | 'contract'
    | 'other';

export type OcrStatus = 'pending' | 'auto_detected' | 'needs_review' | 'manually_set';

export interface User {
    id: string;
    tenant_id: string;
    email: string;
    full_name: string;
    role: Role;
    is_active: boolean;
    created_at: string;
    last_login_at: string | null;
}

export interface Tenant {
    id: string;
    name: string;
    account_type: AccountType;
    created_at: string;
}

export interface Tokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface MeResponse {
    user: User;
    tenant: Tenant;
}

export interface RegisterResponse {
    user: User;
    tenant: Tenant;
    tokens: Tokens;
}

export interface RegisterInput {
    full_name: string;
    email: string;
    password: string;
    account_type: AccountType;
    organization_name?: string;
}

// Named DocumentItem (not Document) so it never clashes with the browser's own Document type.
export interface DocumentItem {
    id: string;
    tenant_id: string;
    owner_user_id: string;
    title: string;
    document_type: DocumentType;
    original_filename: string | null;
    content_type: string | null;
    file_size: number | null;
    expiry_date: string | null; // a date at midnight UTC, e.g. "2026-11-05T00:00:00Z"
    suggested_expiry_date: string | null; // OCR's unsure guess
    ocr_status: OcrStatus;
    ocr_confidence: number | null; // 0 to 1
    status: DocumentStatus;
    created_at: string;
    updated_at: string;
}

export interface DocumentList {
    items: DocumentItem[];
    total: number;
    skip: number;
    limit: number;
}

export interface UploadSlot {
    document_id: string;
    upload_url: string;
    method: string;
    headers: Record<string, string>;
    expires_in: number;
}

export interface ViewUrl {
    url: string;
    expires_in: number;
}

export interface DocumentUpdate {
    title?: string;
    document_type?: DocumentType;
    expiry_date?: string; // "YYYY-MM-DD"
}

export interface NewMemberInput {
    full_name: string;
    email: string;
    password: string;
    role: Role;
}

// Sprint 4 admin endpoints
export interface JobReport {
    dry_run: boolean;
    stuck_reprocessed: number;
    orphans_deleted: number;
    statuses_updated: number;
    reminders_due: number;
    emails_sent: number;
    emails_failed: number;
}

export interface EmailTestResult {
    mode: string;
    sent_to: string;
}