import "server-only";
import { randomUUID } from "crypto";

export const attachmentRules = {
  "image/jpeg": { extension: "jpg", maxBytes: 10 * 1024 * 1024 },
  "image/png": { extension: "png", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { extension: "webp", maxBytes: 10 * 1024 * 1024 },
  "video/mp4": { extension: "mp4", maxBytes: 50 * 1024 * 1024 },
  "video/webm": { extension: "webm", maxBytes: 50 * 1024 * 1024 },
  "video/quicktime": { extension: "mov", maxBytes: 50 * 1024 * 1024 },
} as const;

export const maximumAttachmentsPerReport = 5;
export type AttachmentMimeType = keyof typeof attachmentRules;
export type AttachmentMetadata = { report_id: string; storage_path: string; original_name: string; mime_type: AttachmentMimeType; size_bytes: number; created_at?: string };

export function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export function validateAttachmentInput(input: { fileName?: unknown; mimeType?: unknown; size?: unknown }) {
  if (typeof input.fileName !== "string" || !input.fileName.trim() || input.fileName.length > 255) return { error: "Nome de arquivo inválido." } as const;
  if (typeof input.mimeType !== "string" || !(input.mimeType in attachmentRules)) return { error: "Este tipo de arquivo não é permitido." } as const;
  if (typeof input.size !== "number" || !Number.isSafeInteger(input.size) || input.size < 1) return { error: "Tamanho de arquivo inválido." } as const;
  const rule = attachmentRules[input.mimeType as AttachmentMimeType];
  if (input.size > rule.maxBytes) return { error: input.mimeType.startsWith("image/") ? "Imagens podem ter até 10 MB." : "Vídeos podem ter até 50 MB." } as const;
  return { value: { fileName: input.fileName.trim(), mimeType: input.mimeType as AttachmentMimeType, size: input.size } } as const;
}

export function newStoragePath(reportId: string, mimeType: AttachmentMimeType) { return `reports/${reportId}/${randomUUID()}.${attachmentRules[mimeType].extension}`; }
