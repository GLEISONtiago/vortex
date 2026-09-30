import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

const bucket = "vortex-attachments";
const maxPartBytes = 60 * 1024 * 1024;
const maxReportsPerPart = 30;

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

function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return {
    start: `${month}-01T00:00:00-03:00`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00-03:00`,
  };
}

function chunkReports(
  reports: Array<{ id: string }>,
  attachmentBytes: Map<string, number>,
) {
  const parts: Array<Array<{ id: string }>> = [];
  let current: Array<{ id: string }> = [];
  let currentBytes = 0;

  for (const report of reports) {
    const bytes = attachmentBytes.get(report.id) ?? 0;
    if (
      current.length > 0
      && (current.length >= maxReportsPerPart || currentBytes + bytes > maxPartBytes)
    ) {
      parts.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(report);
    currentBytes += bytes;
  }

  if (current.length > 0) parts.push(current);
  return parts;
}

export async function GET(request: Request) {
  const userId = await adminUser();
  if (!userId) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  const requestedPart = Number(url.searchParams.get("part") ?? "1");
  const range = monthRange(month);

  if (!range || !Number.isSafeInteger(requestedPart) || requestedPart < 1) {
    return NextResponse.json({ error: "Período de backup inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: reports, error: reportsError } = await admin
    .from("vortex_reports")
    .select("id, protocol, category_id, status, urgency, resolution, description, address, neighborhood, reference_point, latitude, longitude, event_at, tracking_code_hash, tracking_pin_hash, created_at, updated_at, vortex_categories(name)")
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: true });

  if (reportsError) {
    return NextResponse.json({ error: "Não foi possível preparar as denúncias." }, { status: 500 });
  }

  const reportRows = reports ?? [];
  if (reportRows.length === 0) {
    return NextResponse.json({ error: "Não há denúncias nesse período." }, { status: 404 });
  }

  const reportIds = reportRows.map((report) => report.id);
  const { data: attachments, error: attachmentsError } = await admin
    .from("vortex_attachments")
    .select("id, report_id, storage_path, original_name, mime_type, size_bytes, created_at, backed_up_at, storage_deleted_at")
    .in("report_id", reportIds)
    .order("created_at", { ascending: true });

  if (attachmentsError) {
    return NextResponse.json({ error: "Não foi possível preparar os anexos." }, { status: 500 });
  }

  const attachmentBytes = new Map<string, number>();
  for (const attachment of attachments ?? []) {
    if (!attachment.storage_deleted_at) {
      attachmentBytes.set(
        attachment.report_id,
        (attachmentBytes.get(attachment.report_id) ?? 0) + Number(attachment.size_bytes ?? 0),
      );
    }
  }

  const parts = chunkReports(reportRows, attachmentBytes);
  if (requestedPart > parts.length) {
    return NextResponse.json({ error: "Parte de backup inexistente." }, { status: 404 });
  }

  const selectedIds = new Set(parts[requestedPart - 1].map((report) => report.id));
  const selectedReports = reportRows.filter((report) => selectedIds.has(report.id));
  const selectedAttachments = (attachments ?? []).filter((attachment) => selectedIds.has(attachment.report_id));

  const [{ data: history }, { data: messages }, { data: assignments }] = await Promise.all([
    admin
      .from("vortex_report_history")
      .select("id, report_id, old_status, new_status, note, changed_by, created_at")
      .in("report_id", Array.from(selectedIds))
      .order("created_at", { ascending: true }),
    admin
      .from("vortex_messages")
      .select("id, report_id, sender_type, message, created_at, read_at")
      .in("report_id", Array.from(selectedIds))
      .order("created_at", { ascending: true }),
    admin
      .from("vortex_report_assignments")
      .select("id, report_id, assigned_to, assigned_by, assigned_at, ended_at, note, created_at")
      .in("report_id", Array.from(selectedIds))
      .order("assigned_at", { ascending: true }),
  ]);

  const profileIds = Array.from(new Set((assignments ?? []).flatMap((item) => [item.assigned_to, item.assigned_by]).filter(Boolean))) as string[];
  const { data: assignmentProfiles } = profileIds.length
    ? await admin.from("vortex_profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const profileNames = new Map((assignmentProfiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const availablePaths = selectedAttachments
    .filter((attachment) => !attachment.storage_deleted_at)
    .map((attachment) => attachment.storage_path);

  const signedByPath = new Map<string, string>();
  for (let offset = 0; offset < availablePaths.length; offset += 50) {
    const paths = availablePaths.slice(offset, offset + 50);
    const { data: signed, error: signedError } = await admin.storage
      .from(bucket)
      .createSignedUrls(paths, 60 * 30);

    if (signedError) {
      return NextResponse.json({ error: "Não foi possível preparar os links dos anexos." }, { status: 500 });
    }

    signed?.forEach((item, index) => {
      if (item.signedUrl) signedByPath.set(paths[index], item.signedUrl);
    });
  }

  const payloadReports = selectedReports.map((report) => ({
    ...report,
    attachments: selectedAttachments
      .filter((attachment) => attachment.report_id === report.id)
      .map((attachment) => ({
        ...attachment,
        signedUrl: attachment.storage_deleted_at ? null : signedByPath.get(attachment.storage_path) ?? null,
      })),
    history: (history ?? []).filter((item) => item.report_id === report.id),
    messages: (messages ?? []).filter((item) => item.report_id === report.id),
    assignments: (assignments ?? []).filter((item) => item.report_id === report.id).map((item) => ({
      ...item,
      assigned_to_name: profileNames.get(item.assigned_to) ?? null,
      assigned_by_name: item.assigned_by ? profileNames.get(item.assigned_by) ?? null : null,
    })),
  }));

  return NextResponse.json({
    month,
    part: requestedPart,
    totalParts: parts.length,
    generatedAt: new Date().toISOString(),
    reports: payloadReports,
  });
}
