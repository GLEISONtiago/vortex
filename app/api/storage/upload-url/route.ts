import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { authorizeAttachmentUpload } from "../../../../lib/storage/authorized-attachments";
import { isUuid, maximumAttachmentsPerReport, newStoragePath, validateAttachmentInput } from "../../../../lib/storage/attachments";
import { createUploadUrl, storageUrlExpiry } from "../../../../lib/storage/s3";

export const runtime = "nodejs";
type Body = { uploadToken?: unknown; attachmentToken?: unknown; reportId?: unknown; fileName?: unknown; mimeType?: unknown; size?: unknown };
function authorizationError(code?: string) {
  if (code === "PGRST202" || code === "42883") return "A função de anexos ainda não está disponível no banco de dados.";
  if (code === "42501") return "O serviço de anexos não tem permissão para autorizar o envio.";
  if (code === "P0001") return "A sessão temporária de anexos foi recusada ou expirou. Crie uma nova denúncia para tentar novamente.";
  return "Não foi possível autorizar o anexo.";
}

export async function POST(request: Request) {
  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 }); }
  const file = validateAttachmentInput(body);
  if ("error" in file) return NextResponse.json({ error: file.error }, { status: 400 });
  if (typeof body.uploadToken === "string" && body.uploadToken) {
    let admin;
    try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "O serviço de anexos não está configurado no servidor." }, { status: 503 }); }
    try {
      if (typeof body.attachmentToken === "string" && body.attachmentToken) {
        const { data, error } = await admin.rpc("vortex_get_pending_public_attachment", { p_upload_token: body.uploadToken, p_attachment_token: body.attachmentToken });
        const pending = data?.[0] as { storage_path?: string; mime_type?: string; size_bytes?: number } | undefined;
        if (error || !pending?.storage_path || pending.mime_type !== file.value.mimeType || pending.size_bytes !== file.value.size) return NextResponse.json({ error: authorizationError(error?.code) }, { status: 403 });
        const uploadUrl = await createUploadUrl(pending.storage_path, file.value.mimeType, file.value.size);
        return NextResponse.json({ uploadUrl, attachmentToken: body.attachmentToken, expiresIn: storageUrlExpiry.upload });
      }
      const { data, error } = await admin.rpc("vortex_reserve_public_attachment_upload", { p_upload_token: body.uploadToken, p_original_name: file.value.fileName, p_mime_type: file.value.mimeType, p_file_size: file.value.size });
      const reservation = data?.[0] as { storage_path?: string; attachment_token?: string } | undefined;
      if (error || !reservation?.storage_path || !reservation.attachment_token) return NextResponse.json({ error: authorizationError(error?.code) }, { status: 403 });
      const uploadUrl = await createUploadUrl(reservation.storage_path, file.value.mimeType, file.value.size);
      return NextResponse.json({ uploadUrl, attachmentToken: reservation.attachment_token, expiresIn: storageUrlExpiry.upload });
    } catch { return NextResponse.json({ error: "O armazenamento de anexos está indisponível no momento." }, { status: 503 }); }
  }
  if (!isUuid(body.reportId)) return NextResponse.json({ error: "Denúncia inválida." }, { status: 400 });
  const supabase = await authorizeAttachmentUpload(body.reportId);
  if (!supabase) return NextResponse.json({ error: "Você não tem permissão para anexar arquivos a esta denúncia." }, { status: 403 });
  const { count, error: countError } = await supabase.from("vortex_attachments").select("id", { count: "exact", head: true }).eq("report_id", body.reportId);
  if (countError) return NextResponse.json({ error: "Não foi possível validar os anexos existentes." }, { status: 500 });
  if ((count || 0) >= maximumAttachmentsPerReport) return NextResponse.json({ error: "Esta denúncia já possui o limite de 5 anexos." }, { status: 400 });
  const storagePath = newStoragePath(body.reportId, file.value.mimeType);
  try { const uploadUrl = await createUploadUrl(storagePath, file.value.mimeType, file.value.size); return NextResponse.json({ uploadUrl, storagePath, expiresIn: storageUrlExpiry.upload }); } catch { return NextResponse.json({ error: "Não foi possível preparar o envio do anexo." }, { status: 503 }); }
}
