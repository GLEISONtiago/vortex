import { createAdminClient } from "../../../lib/supabase/admin";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { BackupClient } from "./backup-client";
import { RestoreBackup } from "./restore-backup";

const maxPartBytes = 60 * 1024 * 1024;
const maxReportsPerPart = 30;

type ReportRow = {
  id: string;
  protocol: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  report_id: string;
  size_bytes: number | null;
  backed_up_at: string | null;
  storage_deleted_at: string | null;
};

function monthKey(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function buildParts(reports: Array<{ id: string; bytes: number }>) {
  const parts: Array<{ part: number; reportCount: number; bytes: number }> = [];
  let reportCount = 0;
  let bytes = 0;

  const flush = () => {
    if (!reportCount) return;
    parts.push({ part: parts.length + 1, reportCount, bytes });
    reportCount = 0;
    bytes = 0;
  };

  for (const report of reports) {
    if (
      reportCount > 0
      && (reportCount >= maxReportsPerPart || bytes + report.bytes > maxPartBytes)
    ) {
      flush();
    }

    reportCount += 1;
    bytes += report.bytes;
  }

  flush();
  return parts;
}

export default async function BackupPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [
    { data: usageRows },
    { data: reportsData },
    { data: attachmentsData },
    { data: batchesData },
  ] = await Promise.all([
    admin.rpc("vortex_get_storage_usage"),
    admin
      .from("vortex_reports")
      .select("id, protocol, status, created_at, updated_at")
      .order("created_at", { ascending: false }),
    admin
      .from("vortex_attachments")
      .select("report_id, size_bytes, backed_up_at, storage_deleted_at"),
    admin
      .from("vortex_backup_batches")
      .select("id, label, report_count, attachment_count, size_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const usage = usageRows?.[0] ?? {
    used_bytes: 0,
    object_count: 0,
    quota_bytes: 1024 * 1024 * 1024,
    remaining_bytes: 1024 * 1024 * 1024,
    usage_percent: 0,
    warning_level: "OK",
  };

  const reports = (reportsData ?? []) as ReportRow[];
  const attachments = (attachmentsData ?? []) as AttachmentRow[];
  const attachmentsByReport = new Map<string, AttachmentRow[]>();

  for (const attachment of attachments) {
    const current = attachmentsByReport.get(attachment.report_id) ?? [];
    current.push(attachment);
    attachmentsByReport.set(attachment.report_id, current);
  }

  const monthMap = new Map<string, {
    month: string;
    reportCount: number;
    attachmentCount: number;
    activeBytes: number;
    pendingBackupBytes: number;
    reports: Array<{ id: string; bytes: number }>;
  }>();

  for (const report of reports) {
    const key = monthKey(report.created_at);
    const reportAttachments = attachmentsByReport.get(report.id) ?? [];
    const active = reportAttachments.filter((attachment) => !attachment.storage_deleted_at);
    const bytes = active.reduce((sum, attachment) => sum + Number(attachment.size_bytes ?? 0), 0);
    const pendingBytes = active
      .filter((attachment) => !attachment.backed_up_at)
      .reduce((sum, attachment) => sum + Number(attachment.size_bytes ?? 0), 0);

    const entry = monthMap.get(key) ?? {
      month: key,
      reportCount: 0,
      attachmentCount: 0,
      activeBytes: 0,
      pendingBackupBytes: 0,
      reports: [],
    };

    entry.reportCount += 1;
    entry.attachmentCount += active.length;
    entry.activeBytes += bytes;
    entry.pendingBackupBytes += pendingBytes;
    entry.reports.push({ id: report.id, bytes });
    monthMap.set(key, entry);
  }

  const months = Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((entry) => ({
      month: entry.month,
      label: monthLabel(entry.month),
      reportCount: entry.reportCount,
      attachmentCount: entry.attachmentCount,
      activeBytes: entry.activeBytes,
      pendingBackupBytes: entry.pendingBackupBytes,
      parts: buildParts(entry.reports),
    }));

  const reportById = new Map(reports.map((report) => [report.id, report]));
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const cleanup = attachments.reduce(
    (acc, attachment) => {
      const report = reportById.get(attachment.report_id);
      if (
        report
        && report.status === "FINALIZADA"
        && new Date(report.updated_at).getTime() < cutoff
        && attachment.backed_up_at
        && !attachment.storage_deleted_at
      ) {
        acc.files += 1;
        acc.bytes += Number(attachment.size_bytes ?? 0);
      }
      return acc;
    },
    { files: 0, bytes: 0 },
  );

  return <div className="max-w-5xl">
    <p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">ARMAZENAMENTO E BACKUP</p>
    <h1 className="mt-2 text-3xl font-bold">Backup das denúncias</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
      Acompanhe o espaço usado no Supabase, baixe cópias organizadas das denúncias e remova
      imagens antigas somente depois de confirmar que o backup foi salvo em outro local.
    </p>

    <BackupClient
      usage={{
        usedBytes: Number(usage.used_bytes ?? 0),
        objectCount: Number(usage.object_count ?? 0),
        quotaBytes: Number(usage.quota_bytes ?? 0),
        remainingBytes: Number(usage.remaining_bytes ?? 0),
        usagePercent: Number(usage.usage_percent ?? 0),
        warningLevel: String(usage.warning_level ?? "OK"),
      }}
      months={months}
      cleanup={cleanup}
      recentBatches={(batchesData ?? []).map((batch) => ({
        id: batch.id,
        label: batch.label,
        reportCount: batch.report_count,
        attachmentCount: batch.attachment_count,
        sizeBytes: Number(batch.size_bytes ?? 0),
        createdAt: batch.created_at,
      }))}
    />
    <div className="mt-8"><RestoreBackup /></div>
  </div>;
}
