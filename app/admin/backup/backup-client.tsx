"use client";

import { useMemo, useState } from "react";
import { createZip, safeFileName, textBytes } from "../../../lib/backup/zip";
import { offlineBackupCss, offlineIndexHtml, offlineReportHtml } from "../../../lib/backup/offline-html";

type Usage = {
  usedBytes: number;
  objectCount: number;
  quotaBytes: number;
  remainingBytes: number;
  usagePercent: number;
  warningLevel: string;
};

type MonthSummary = {
  month: string;
  label: string;
  reportCount: number;
  attachmentCount: number;
  activeBytes: number;
  pendingBackupBytes: number;
  parts: Array<{ part: number; reportCount: number; bytes: number }>;
};

type Batch = {
  id: string;
  label: string;
  reportCount: number;
  attachmentCount: number;
  sizeBytes: number;
  createdAt: string;
};

type BackupAttachment = {
  id: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  backed_up_at: string | null;
  storage_deleted_at: string | null;
  signedUrl?: string | null;
  backup_file?: string | null;
};

type BackupReport = {
  id: string;
  protocol: string;
  category_id: string | null;
  status: string;
  urgency: string;
  resolution: string | null;
  description: string;
  address: string | null;
  neighborhood: string | null;
  reference_point: string | null;
  latitude: number | null;
  longitude: number | null;
  event_at: string | null;
  created_at: string;
  updated_at: string;
  tracking_code_hash: string | null;
  tracking_pin_hash: string | null;
  vortex_categories: { name?: string } | Array<{ name?: string }> | null;
  attachments: BackupAttachment[];
  history: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
};

type BackupPayload = {
  month: string;
  part: number;
  totalParts: number;
  generatedAt: string;
  reports: BackupReport[];
  error?: string;
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function categoryName(report: BackupReport) {
  if (Array.isArray(report.vortex_categories)) return report.vortex_categories[0]?.name ?? "Não informada";
  return report.vortex_categories?.name ?? "Não informada";
}

function reportText(report: BackupReport) {
  return [
    "VÓRTEX — REGISTRO DE DENÚNCIA",
    "",
    `Protocolo: ${report.protocol}`,
    `Categoria: ${categoryName(report)}`,
    `Status: ${report.status}`,
    `Urgência: ${report.urgency}`,
    `Resultado: ${report.resolution || "Não informado"}`,
    `Registrada em: ${new Date(report.created_at).toLocaleString("pt-BR")}`,
    `Fato ocorrido em: ${report.event_at ? new Date(report.event_at).toLocaleString("pt-BR") : "Não informado"}`,
    "",
    "LOCAL",
    `Endereço: ${report.address || "Não informado"}`,
    `Bairro: ${report.neighborhood || "Não informado"}`,
    `Ponto de referência: ${report.reference_point || "Não informado"}`,
    `Latitude: ${report.latitude ?? "Não informada"}`,
    `Longitude: ${report.longitude ?? "Não informada"}`,
    "",
    "DESCRIÇÃO",
    report.description,
    "",
    `Anexos registrados: ${report.attachments.length}`,
    `Eventos no histórico: ${report.history.length}`,
    `Mensagens: ${report.messages.length}`,
    "",
    "Este arquivo foi gerado pelo Vórtex para backup administrativo.",
  ].join("\r\n");
}

function extension(mimeType: string | null) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

async function fetchBytes(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível baixar uma das imagens do backup.");
  return new Uint8Array(await response.arrayBuffer());
}

export function BackupClient({
  usage,
  months,
  cleanup,
  recentBatches,
}: {
  usage: Usage;
  months: MonthSummary[];
  cleanup: { files: number; bytes: number };
  recentBatches: Batch[];
}) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState<{
    reportIds: string[];
    label: string;
    month: string;
    part: number;
  } | null>(null);
  const [cleanupConfirmation, setCleanupConfirmation] = useState("");

  const usageTone = useMemo(() => {
    if (usage.warningLevel === "CRITICAL") return "border-red-300 bg-red-50 text-red-900";
    if (usage.warningLevel === "WARNING") return "border-amber-300 bg-amber-50 text-amber-900";
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }, [usage.warningLevel]);

  const downloadBackup = async (month: string, part: number) => {
    const key = `${month}-${part}`;
    setBusy(key);
    setMessage("");
    setPrepared(null);

    try {
      const response = await fetch(
        `/api/admin/backup?month=${encodeURIComponent(month)}&part=${part}`,
        { cache: "no-store" },
      );
      const payload = await response.json() as BackupPayload;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Não foi possível preparar o backup.");
      }

      const root = `VORTEX-backup-${month}-parte-${String(part).padStart(2, "0")}`;
      const files: Array<{ path: string; data: Uint8Array }> = [];
      const reportIds = payload.reports.map((report) => report.id);

      files.push({
        path: `${root}/README.txt`,
        data: textBytes([
          "Backup administrativo do Vórtex",
          `Período: ${month}`,
          `Parte: ${part} de ${payload.totalParts}`,
          `Gerado em: ${new Date(payload.generatedAt).toLocaleString("pt-BR")}`,
          `Denúncias: ${payload.reports.length}`,
          "",
          "COMO CONSULTAR:",
          "1. Extraia todo o conteúdo do ZIP.",
          "2. Abra ABRIR-BACKUP.html no navegador.",
          "3. O painel funciona offline e permite navegar pelas denúncias e anexos.",
          "",
          "Estrutura:",
          "ABRIR-BACKUP.html (painel offline)",
          "denuncias/ANO/PROTOCOLO/index.html",
          "denuncias/ANO/PROTOCOLO/denuncia.txt",
          "denuncias/ANO/PROTOCOLO/denuncia.json",
          "denuncias/ANO/PROTOCOLO/historico.json",
          "denuncias/ANO/PROTOCOLO/mensagens.json",
          "denuncias/ANO/PROTOCOLO/atribuicoes.json",
          "denuncias/ANO/PROTOCOLO/anexos/",
          "manifesto.json (usado para validação/restauração)",
          "",
          "Guarde este arquivo em local seguro antes de confirmar o backup no sistema.",
        ].join("\r\n")),
      });

      files.push({
        path: `${root}/indice.json`,
        data: textBytes(JSON.stringify({
          generatedAt: payload.generatedAt,
          month: payload.month,
          part: payload.part,
          totalParts: payload.totalParts,
          reports: payload.reports.map((report) => ({
            protocol: report.protocol,
            status: report.status,
            created_at: report.created_at,
            attachments: report.attachments.length,
          })),
        }, null, 2)),
      });

      const offlineReports: BackupReport[] = [];
      let imageIndex = 0;
      const imageTotal = payload.reports.reduce(
        (sum, report) => sum + report.attachments.filter((item) => item.signedUrl).length,
        0,
      );

      for (const report of payload.reports) {
        const year = new Date(report.created_at).getFullYear();
        const protocol = safeFileName(report.protocol, report.id);
        const folder = `${root}/denuncias/${year}/${protocol}`;

        let attachmentNumber = 0;
        const backupAttachments = report.attachments.map((attachment) => {
          attachmentNumber += 1;
          if (!attachment.signedUrl) return { ...attachment, backup_file: null };
          const originalBase = (attachment.original_name || `imagem-${attachmentNumber}`).replace(/\.[^.]+$/, "");
          const name = safeFileName(originalBase, `imagem-${attachmentNumber}`);
          const fileName = `${String(attachmentNumber).padStart(2, "0")}-${name}.${extension(attachment.mime_type)}`;
          return { ...attachment, backup_file: `anexos/${fileName}` };
        });

        const reportForBackup = { ...report, attachments: backupAttachments.map(({ signedUrl, ...attachment }) => attachment) } as BackupReport;
        offlineReports.push(reportForBackup);

        files.push({ path: `${folder}/denuncia.txt`, data: textBytes(reportText(reportForBackup)) });
        files.push({ path: `${folder}/denuncia.json`, data: textBytes(JSON.stringify(reportForBackup, null, 2)) });
        files.push({ path: `${folder}/historico.json`, data: textBytes(JSON.stringify(report.history, null, 2)) });
        files.push({ path: `${folder}/mensagens.json`, data: textBytes(JSON.stringify(report.messages, null, 2)) });
        files.push({ path: `${folder}/atribuicoes.json`, data: textBytes(JSON.stringify(report.assignments, null, 2)) });
        files.push({ path: `${folder}/index.html`, data: textBytes(offlineReportHtml(reportForBackup)) });

        for (let index = 0; index < report.attachments.length; index += 1) {
          const attachment = report.attachments[index];
          const backupAttachment = backupAttachments[index];
          if (!attachment.signedUrl) {
            if (attachment.storage_deleted_at) continue;
            throw new Error(`A imagem ${attachment.original_name || attachment.id} não pôde ser incluída. O backup foi cancelado para evitar uma cópia incompleta.`);
          }
          imageIndex += 1;
          setMessage(`Baixando imagem ${imageIndex} de ${imageTotal} para montar o arquivo...`);
          const data = await fetchBytes(attachment.signedUrl);
          files.push({ path: `${folder}/${backupAttachment.backup_file}`, data });
        }
      }

      files.push({ path: `${root}/assets/backup.css`, data: textBytes(offlineBackupCss()) });
      const panel = offlineIndexHtml(offlineReports, payload.generatedAt, payload.month, payload.part, payload.totalParts);
      files.push({ path: `${root}/index.html`, data: textBytes(panel) });
      files.push({ path: `${root}/ABRIR-BACKUP.html`, data: textBytes(panel) });
      files.push({
        path: `${root}/manifesto.json`,
        data: textBytes(JSON.stringify({
          system: "VORTEX",
          formatVersion: 2,
          generatedAt: payload.generatedAt,
          month: payload.month,
          part: payload.part,
          totalParts: payload.totalParts,
          reportCount: offlineReports.length,
          attachmentCount: offlineReports.reduce((sum, report) => sum + report.attachments.filter((item) => item.backup_file).length, 0),
          reports: offlineReports.map((report) => ({
            id: report.id,
            protocol: report.protocol,
            folder: `denuncias/${new Date(report.created_at).getFullYear()}/${safeFileName(report.protocol, report.id)}`,
          })),
        }, null, 2)),
      });

      setMessage("Montando o arquivo ZIP no navegador...");
      const zip = createZip(files);
      const downloadUrl = URL.createObjectURL(zip);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${root}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);

      const label = `Backup ${month} — parte ${part}/${payload.totalParts}`;
      setPrepared({ reportIds, label, month, part });
      setMessage("Backup gerado. Salve o ZIP em sua nuvem pessoal e depois confirme abaixo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar o backup.");
    } finally {
      setBusy("");
    }
  };

  const confirmBackup = async () => {
    if (!prepared) return;
    setBusy("confirm");
    setMessage("");

    try {
      const response = await fetch("/api/admin/backup/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportIds: prepared.reportIds,
          label: prepared.label,
          month: prepared.month,
        }),
      });
      const data = await response.json() as { error?: string };

      if (!response.ok) throw new Error(data.error || "Não foi possível confirmar o backup.");

      setPrepared(null);
      setMessage("Backup confirmado. Esses anexos agora podem entrar na limpeza segura quando cumprirem os demais critérios.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao confirmar o backup.");
    } finally {
      setBusy("");
    }
  };

  const runCleanup = async () => {
    setBusy("cleanup");
    setMessage("");

    try {
      const response = await fetch("/api/admin/backup/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: cleanupConfirmation }),
      });
      const data = await response.json() as {
        error?: string;
        removedFiles?: number;
        freedBytes?: number;
      };

      if (!response.ok) throw new Error(data.error || "Não foi possível executar a limpeza.");

      setCleanupConfirmation("");
      setMessage(
        data.removedFiles
          ? `Limpeza concluída: ${data.removedFiles} imagem(ns) removida(s), liberando aproximadamente ${formatBytes(data.freedBytes ?? 0)}.`
          : "Nenhum anexo estava elegível para limpeza.",
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao executar a limpeza.");
    } finally {
      setBusy("");
    }
  };

  return <div className="mt-8 grid gap-8">
    <section className={`rounded-2xl border p-5 sm:p-6 ${usageTone}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold">Uso do Supabase Storage</p>
          <p className="mt-2 text-3xl font-bold">{usage.usagePercent.toFixed(1)}%</p>
          <p className="mt-1 text-sm">
            {formatBytes(usage.usedBytes)} usados de {formatBytes(usage.quotaBytes)}
            {" · "}{usage.objectCount} arquivo(s)
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <p className="font-semibold">{formatBytes(usage.remainingBytes)} disponíveis</p>
          <p className="mt-1">
            {usage.warningLevel === "CRITICAL"
              ? "Espaço crítico. Faça backup e limpeza segura."
              : usage.warningLevel === "WARNING"
                ? "Atenção: o armazenamento está se aproximando do limite."
                : "Capacidade dentro da faixa normal."}
          </p>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-current transition-all"
          style={{ width: `${Math.min(100, usage.usagePercent)}%` }}
        />
      </div>
    </section>

    {message && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div>}

    {prepared && <section className="rounded-2xl border border-[#0c766d]/30 bg-[#e9f7f5] p-5">
      <h2 className="font-bold">Você já salvou esse ZIP em outro local?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Confirme somente depois de copiar o arquivo para sua nuvem pessoal, HD externo ou outro local seguro.
      </p>
      <button
        type="button"
        disabled={busy === "confirm"}
        onClick={() => void confirmBackup()}
        className="mt-4 rounded-lg bg-[#0c766d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy === "confirm" ? "Confirmando..." : "Confirmar backup salvo"}
      </button>
    </section>}

    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Backups por mês</h2>
          <p className="mt-1 text-sm text-slate-600">
            Os ZIPs são montados no seu navegador. As imagens não passam pela Function da Vercel.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {months.length === 0 ? <div className="rounded-xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">Nenhuma denúncia disponível para backup.</div> : months.map((month) => <article key={month.month} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold capitalize">{month.label}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {month.reportCount} denúncia(s) · {month.attachmentCount} imagem(ns) · {formatBytes(month.activeBytes)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ainda sem confirmação de backup: {formatBytes(month.pendingBackupBytes)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {month.parts.map((part) => {
                const key = `${month.month}-${part.part}`;
                return <button
                  key={part.part}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void downloadBackup(month.month, part.part)}
                  className="rounded-lg border border-[#0c766d] px-3 py-2 text-sm font-bold text-[#0c766d] disabled:opacity-50"
                >
                  {busy === key
                    ? "Gerando..."
                    : month.parts.length === 1
                      ? "Baixar backup"
                      : `Baixar parte ${part.part} · ${formatBytes(part.bytes)}`}
                </button>;
              })}
            </div>
          </div>
        </article>)}
      </div>
    </section>

    <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-red-950">Limpeza segura</h2>
      <p className="mt-2 text-sm leading-6 text-red-900">
        Somente imagens de denúncias finalizadas, sem alterações há mais de 90 dias e com backup
        confirmado podem ser removidas do Supabase.
      </p>
      <p className="mt-3 text-sm font-semibold text-red-950">
        Elegíveis agora: {cleanup.files} imagem(ns), aproximadamente {formatBytes(cleanup.bytes)}.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={cleanupConfirmation}
          onChange={(event) => setCleanupConfirmation(event.target.value.toUpperCase())}
          placeholder='Digite "LIMPAR"'
          className="rounded-lg border border-red-300 bg-white px-3 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          disabled={busy === "cleanup" || cleanupConfirmation !== "LIMPAR" || cleanup.files === 0}
          onClick={() => void runCleanup()}
          className="rounded-lg bg-red-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy === "cleanup" ? "Limpando..." : "Remover imagens já protegidas por backup"}
        </button>
      </div>
    </section>

    <section>
      <h2 className="text-xl font-bold">Backups confirmados recentemente</h2>
      <div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        {recentBatches.length === 0 ? <p className="p-5 text-sm text-slate-600">Nenhum backup confirmado ainda.</p> : <ul className="divide-y divide-slate-200">
          {recentBatches.map((batch) => <li key={batch.id} className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div><b>{batch.label}</b><p className="text-slate-500">{new Date(batch.createdAt).toLocaleString("pt-BR")}</p></div>
            <span className="text-slate-600">{batch.reportCount} denúncia(s) · {batch.attachmentCount} imagem(ns) · {formatBytes(batch.sizeBytes)}</span>
          </li>)}
        </ul>}
      </div>
    </section>
  </div>;
}
