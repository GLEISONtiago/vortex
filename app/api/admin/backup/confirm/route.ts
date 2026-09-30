import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";

export const runtime = "nodejs";

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

  let body: { reportIds?: unknown; label?: unknown; month?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (
    !Array.isArray(body.reportIds)
    || body.reportIds.length < 1
    || body.reportIds.length > 30
    || !body.reportIds.every((value) => typeof value === "string")
  ) {
    return NextResponse.json({ error: "Lista de denúncias inválida." }, { status: 400 });
  }

  const reportIds = Array.from(new Set(body.reportIds));
  const label = typeof body.label === "string" && body.label.trim()
    ? body.label.trim().slice(0, 120)
    : "Backup manual Vórtex";

  const admin = createAdminClient();

  const { data: reports, error: reportsError } = await admin
    .from("vortex_reports")
    .select("id, created_at")
    .in("id", reportIds);

  if (reportsError || !reports || reports.length !== reportIds.length) {
    return NextResponse.json({ error: "Não foi possível validar as denúncias do backup." }, { status: 400 });
  }

  const { data: attachments, error: attachmentsError } = await admin
    .from("vortex_attachments")
    .select("id, report_id, size_bytes, storage_deleted_at")
    .in("report_id", reportIds);

  if (attachmentsError) {
    return NextResponse.json({ error: "Não foi possível validar os anexos do backup." }, { status: 500 });
  }

  const activeAttachments = (attachments ?? []).filter((attachment) => !attachment.storage_deleted_at);
  const createdDates = reports.map((report) => new Date(report.created_at));
  const periodStart = new Date(Math.min(...createdDates.map((date) => date.getTime())));
  const periodEnd = new Date(Math.max(...createdDates.map((date) => date.getTime())));

  const { data: batch, error: batchError } = await admin
    .from("vortex_backup_batches")
    .insert({
      label,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      report_count: reports.length,
      attachment_count: activeAttachments.length,
      size_bytes: activeAttachments.reduce((sum, attachment) => sum + Number(attachment.size_bytes ?? 0), 0),
      created_by: userId,
    })
    .select("id, created_at")
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: "Não foi possível registrar o backup." }, { status: 500 });
  }

  const mappings = reportIds.map((reportId) => ({
    batch_id: batch.id,
    report_id: reportId,
  }));

  const { error: mappingError } = await admin
    .from("vortex_report_backups")
    .insert(mappings);

  if (mappingError) {
    await admin.from("vortex_backup_batches").delete().eq("id", batch.id);
    return NextResponse.json({ error: "Não foi possível registrar as denúncias do backup." }, { status: 500 });
  }

  if (activeAttachments.length > 0) {
    const { error: markError } = await admin
      .from("vortex_attachments")
      .update({ backed_up_at: new Date().toISOString() })
      .in("id", activeAttachments.map((attachment) => attachment.id));

    if (markError) {
      return NextResponse.json(
        { error: "O backup foi registrado, mas os anexos não puderam ser marcados como salvos." },
        { status: 500 },
      );
    }
  }

  await admin.from("vortex_audit_log").insert({
    actor_id: userId,
    action: "BACKUP_CONFIRMED",
    entity_type: "BACKUP_BATCH",
    entity_id: batch.id,
    metadata: {
      label,
      report_count: reports.length,
      attachment_count: activeAttachments.length,
      size_bytes: activeAttachments.reduce((sum, attachment) => sum + Number(attachment.size_bytes ?? 0), 0),
    },
  });

  return NextResponse.json({
    confirmed: true,
    batchId: batch.id,
    confirmedAt: batch.created_at,
  });
}
