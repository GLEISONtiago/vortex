import "server-only";
import { createClient } from "../supabase/server";
import { createDownloadUrl } from "./s3";
import { isUuid, type AttachmentMetadata } from "./attachments";

async function authorizedReport(reportId: string) {
  if (!isUuid(reportId)) return null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;
  const [{ data: profile }, { data: report }] = await Promise.all([
    supabase.from("vortex_profiles").select("active").eq("id", userId).maybeSingle(),
    // The report query is evaluated with the caller session, so Supabase RLS remains the authorization boundary.
    supabase.from("vortex_reports").select("id").eq("id", reportId).maybeSingle(),
  ]);
  return profile?.active && report ? supabase : null;
}

export async function authorizeAttachmentUpload(reportId: string) { return authorizedReport(reportId); }

export async function createAuthorizedDownloadUrl(reportId: string, attachmentId: string) {
  const supabase = await authorizedReport(reportId);
  if (!supabase || !isUuid(attachmentId)) return null;
  const { data: attachment } = await supabase.from("vortex_attachments").select("report_id, storage_path, original_name, mime_type, size_bytes, created_at").eq("id", attachmentId).eq("report_id", reportId).maybeSingle();
  if (!attachment) return null;
  return { url: await createDownloadUrl(attachment.storage_path), attachment: attachment as AttachmentMetadata };
}
