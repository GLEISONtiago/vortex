import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

export const runtime = "nodejs";

const bucket = "vortex-attachments";

async function adminUser() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("vortex_profiles")
    .select("role, active")
    .eq("id", userId)
    .maybeSingle();

  return profile?.active && profile.role === "ADMIN" ? userId : null;
}

export async function POST(request: Request) {
  const userId = await adminUser();
  if (!userId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  let body: { confirmation?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (body.confirmation !== "LIMPAR") {
    return NextResponse.json(
      { error: "Digite LIMPAR para confirmar a remoção segura." },
      { status: 400 },
    );
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  const { data: reports, error: reportsError } = await admin
    .from("vortex_reports")
    .select("id")
    .eq("status", "FINALIZADA")
    .lt("updated_at", cutoff)
    .limit(2000);

  if (reportsError) {
    return NextResponse.json({ error: "Não foi possível localizar denúncias elegíveis." }, { status: 500 });
  }

  const reportIds = (reports ?? []).map((report) => report.id);
  if (reportIds.length === 0) {
    return NextResponse.json({ removedFiles: 0, freedBytes: 0 });
  }

  const { data: attachments, error: attachmentsError } = await admin
    .from("vortex_attachments")
    .select("id, storage_path, size_bytes")
    .in("report_id", reportIds)
    .not("backed_up_at", "is", null)
    .is("storage_deleted_at", null)
    .limit(5000);

  if (attachmentsError) {
    return NextResponse.json({ error: "Não foi possível localizar anexos elegíveis." }, { status: 500 });
  }

  const rows = attachments ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ removedFiles: 0, freedBytes: 0 });
  }

  const removedIds: string[] = [];
  let freedBytes = 0;

  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const { error: removeError } = await admin.storage
      .from(bucket)
      .remove(batch.map((attachment) => attachment.storage_path));

    if (removeError) {
      return NextResponse.json(
        {
          error: "A limpeza foi interrompida porque alguns arquivos não puderam ser removidos.",
          removedFiles: removedIds.length,
          freedBytes,
        },
        { status: 500 },
      );
    }

    for (const attachment of batch) {
      removedIds.push(attachment.id);
      freedBytes += Number(attachment.size_bytes ?? 0);
    }
  }

  const { error: updateError } = await admin
    .from("vortex_attachments")
    .update({ storage_deleted_at: new Date().toISOString() })
    .in("id", removedIds);

  if (updateError) {
    return NextResponse.json(
      { error: "Os arquivos foram removidos, mas o registro da limpeza precisa ser revisado." },
      { status: 500 },
    );
  }

  await admin.from("vortex_audit_log").insert({
    actor_id: userId,
    action: "STORAGE_CLEANUP",
    entity_type: "STORAGE",
    metadata: {
      removed_files: removedIds.length,
      freed_bytes: freedBytes,
      retention_days: 90,
    },
  });

  return NextResponse.json({
    removedFiles: removedIds.length,
    freedBytes,
  });
}
