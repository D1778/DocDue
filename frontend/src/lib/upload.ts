// Uploading a file is a 3-step dance (see Sprint 2):
//   1. ask our backend for a temporary upload link
//   2. send the file straight to S3 with that link
//   3. tell our backend "done", so it checks the file and starts the OCR reading

import { api } from './api';
import { formatFileSize } from './format';
import type { DocumentItem, DocumentType } from './types';

export const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const ACCEPT_ATTRIBUTE = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? '10');

export interface FileInfo {
  name: string;
  type: string;
  size: number;
}

/** Returns a message if the file cannot be uploaded, or null if it is fine. */
export function validateFile(file: FileInfo): string | null {
  if (file.size === 0) return 'This file is empty.';
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return 'Only PDF, JPEG and PNG files are allowed.';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `This file is too large (${formatFileSize(file.size)}). The limit is ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadError';
  }
}

/** Sends the file to S3. XMLHttpRequest is used because fetch cannot report upload progress. */
export function putToS3(
  url: string,
  headers: Record<string, string>,
  file: Blob,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new UploadError(
            `The storage service refused the file (code ${xhr.status}). The upload link may have expired. Please try again.`,
          ),
        );
      }
    };
    xhr.onerror = () =>
      reject(
        new UploadError(
          'The upload failed. Check your internet connection. If it keeps failing, the S3 bucket CORS setting may be wrong.',
        ),
      );
    xhr.onabort = () => reject(new UploadError('The upload was cancelled.'));
    xhr.send(file);
  });
}

export type UploadStage = 'requesting' | 'uploading' | 'confirming';

export async function uploadDocument(
  file: File,
  meta: { title: string; document_type: DocumentType },
  onStage: (stage: UploadStage, percent?: number) => void,
): Promise<DocumentItem> {
  onStage('requesting');
  const slot = await api.requestUpload({
    filename: file.name,
    content_type: file.type.toLowerCase(),
    file_size: file.size,
    document_type: meta.document_type,
    title: meta.title.trim() || undefined,
  });

  onStage('uploading', 0);
  await putToS3(slot.upload_url, slot.headers, file, (percent) => onStage('uploading', percent));

  onStage('confirming');
  return api.completeUpload(slot.document_id);
}