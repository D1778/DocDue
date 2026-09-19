# CLAUDE.md — DocDue Project Context

This file gives Claude Code the background for this repo. It summarizes decisions made while planning this project in a separate chat, so sessions here don't start from zero.

## Project Overview

**Name:** DocDue
**Type:** SaaS web application (final MCA project)
**Developer:** Solo project — Dinu Devees George, PG Scholar, Dept. of Computer Science and Applications, CHRIST (Deemed to be University), Bangalore Central Campus

**Problem it solves:** Individuals and businesses lose track of expiring documents (licenses, certificates, insurance, IDs, permits) because tracking is manual (memory, spreadsheets, sticky notes). Missed renewals cause fines, legal trouble, or service lapses.

**Core solution:** User uploads a document (photo/scan) → OCR automatically extracts the expiry date (no manual entry) → the system watches all documents in the background → sends reminder alerts (email) before expiry.

**Novelty/differentiator:** OCR-based automatic expiry date extraction, instead of requiring manual date entry like a typical reminder app.

## Product Design Decisions

### Multi-tenancy model
- A "tenant" = an account. This works identically for an individual (tenant with 1 user) or an organization (tenant with many users). No separate system needed for personal vs business use.
- Every user and document is tagged with a `tenant_id`. Every query must filter by the current user's tenant — this is a hard security requirement, not optional.
- Roles: admin (can invite staff, manage settings) vs regular staff/user (upload/view only).

### Personal vault + organization vault linking
- A user can have a personal vault AND be a member of one or more organization vaults (e.g., after joining a company).
- Documents already uploaded to a personal vault can be **linked/shared** into an org vault instead of being re-uploaded:
  - The file in S3 is NOT duplicated or moved.
  - A new lightweight DB record marks "this document is also visible in Org X's vault, shared by User Y."
  - OCR does not need to re-run — the previously extracted expiry date is reused.
- Sharing must be an **explicit user action**, never automatic. Joining an org must not expose all personal documents by default — only what the user chooses to link.
- The org side should have **read-only** access to a linked document; only the original owner can edit/delete it.
- If a user leaves an org, the link should be removable without affecting their personal copy.

### OCR handling
- Primary path: OCR (Tesseract via `pytesseract`) reads the document and extracts an expiry date using date-pattern matching.
- If OCR extraction isn't confident/valid, do NOT guess — flag the document as "needs review" and let the user manually enter/correct the date. Always keep a manual override path.
- Store only what's needed (the extracted expiry date), not the full raw OCR text dump, to minimize sensitive data retention.

## Tech Stack (finalized)

| Layer | Choice |
|---|---|
| Frontend | Next.js, Tailwind CSS, Axios/fetch |
| Backend | FastAPI (Python) |
| Database | MongoDB, hosted on MongoDB Atlas (M0 free tier) |
| Cloud storage | AWS S3 (presigned URLs, per-tenant folder structure, private-by-default bucket) + AWS IAM (least-privilege access) |
| OCR | Tesseract OCR via `pytesseract` (free/open-source — NOT AWS Textract, to stay zero-cost) |
| Background jobs/scheduling | APScheduler (Python) or a simple cron job — for the daily expiry-scan task |
| Alerts | SMTP email (Gmail SMTP or a free tier like Resend/Brevo) — SMS/Twilio intentionally skipped to avoid cost |
| Auth | JWT-based auth; passwords hashed with bcrypt |
| Hosting/deployment | Not finalized yet — leaning toward Vercel (frontend) + Render/Railway/EC2 free tier (backend) |

**Cost constraint: this project must stay at $0.** Always prefer free-tier services and open-source tools over paid ones. Set an AWS billing alarm as a safety net. Avoid AWS RDS, NAT gateways, Textract, or any service without a meaningful free tier.

## Suggested Database Schema / Document Collections (starting point)

- `tenants` — collection for tenant accounts (individual or organization)
- `users` — collection for users; belongs to a tenant; login credentials + role
- `documents` — collection for documents; belongs to a tenant; stores S3 file path, document type, upload date, owner user
- `expiry_records` — collection (or embedded document) linked to a document; stores extracted or manually-entered expiry date, and whether it was OCR-detected or manually overridden
- `alert_logs` — collection for alert logs; records which alerts were sent, when, for which document (prevents duplicate/spam notifications)
- `document_shares` — collection linking a document to an additional tenant (org) it's shared with, separate from its owning tenant

## Security Requirements

- S3 server-side encryption at rest; HTTPS/TLS for all traffic.
- S3 bucket must be private by default — all access via short-lived presigned URLs.
- Least-privilege IAM policy for backend's AWS credentials.
- Tenant isolation enforced on every single query (no query without a tenant filter).
- Passwords hashed with bcrypt, never stored in plain text.
- Short-lived JWT tokens with refresh, not indefinite sessions.
- File upload validation: restrict file types/sizes; consider basic malware/type scanning.
- Users must be able to permanently delete a document (actually removed from S3, not just hidden).
- Audit log of document views/downloads is a nice-to-have, good for the project report.

## Development Process (for report/viva purposes)

This project follows a Scrum-influenced workflow:
- **Repo structure:** monorepo with `frontend/` (Next.js) and `backend/` (FastAPI) folders.
- **Branching:** `main` stays stable; feature branches per component (`feature/auth-jwt`, `feature/s3-upload`, `feature/ocr-pipeline`, `feature/expiry-scheduler`, `feature/alerts-smtp`, `feature/frontend-dashboard`).
- **Sprint plan (GitHub Project board):**
  1. Sprint 1 — Auth (JWT + bcrypt) + DB schema (Postgres/Supabase)
  2. Sprint 2 — S3 upload + presigned URLs + IAM setup
  3. Sprint 3 — OCR pipeline (Tesseract/pytesseract)
  4. Sprint 4 — APScheduler expiry checks + SMTP alerts
  5. Sprint 5 — Next.js frontend (upload, list, detail, settings pages)
  6. Sprint 6 — Deployment
- Commit history and the Project board together serve as evidence of following an Agile/Scrum process in the project report.

## Frontend Scope (kept intentionally lighter than backend)

- Upload page (pick file, tag document type, upload via presigned URL)
- Document list with filters: Expiring soon / Expired / Valid (color-coded)
- Detail/preview page (view document, see/correct expiry date)
- Alert settings page (choose reminder lead time, email preference)
- Login/signup pages (standard auth)

The backend, database, cloud pipeline, and OCR logic are the primary engineering focus of this project — the frontend is functional but intentionally not the differentiator.

## Notes for Claude Code

- When implementing, prioritize backend/data-pipeline correctness over frontend polish, per the scope decision above.
- Always keep tenant-isolation logic in mind for any query involving `documents`, `users`, or `expiry_records`.
- Keep all AWS/DB/SMTP credentials in `.env` (never commit — `.gitignore` already covers this) and reference `.env.example` for the expected variable names.
- When in doubt about scope, favor the simplest free-tier-compatible implementation over a more "production-grade" paid alternative.
