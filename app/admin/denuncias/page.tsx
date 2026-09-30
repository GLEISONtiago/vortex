import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { statusLabel, urgencyLabel } from "../presentation";

const PAGE_SIZE = 20;
const STATUSES = ["NOVA","EM_ANALISE","ENCAMINHADA","EM_ATENDIMENTO","CONCLUIDA","IMPROCEDENTE"];
const URGENCIES = ["LOW","MEDIUM","HIGH"];

function badgeClass(kind: "status" | "urgency", value: string) {
  if (kind === "urgency") return value === "HIGH" ? "bg-red-50 text-red-800 ring-red-200" : value === "MEDIUM" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-100 text-slate-700 ring-slate-200";
  if (value === "NOVA") return "bg-blue-50 text-blue-800 ring-blue-200";
  if (value === "EM_ANALISE" || value === "ENCAMINHADA") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (value === "EM_ATENDIMENTO") return "bg-teal-50 text-teal-800 ring-teal-200";
  if (value === "CONCLUIDA") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function queryString(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) q.set(key, value); });
  return q.toString();
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; urgency?: string; q?: string; neighborhood?: string; from?: string; to?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = await createClient();

  let query = supabase.from("vortex_reports")
    .select("id, protocol, status, urgency, neighborhood, event_at, created_at, vortex_categories(name), vortex_report_assignments!left(assigned_to, ended_at, assignee:vortex_profiles!vortex_report_assignments_assigned_to_fkey(full_name))", { count: "exact" })
    .is("vortex_report_assignments.ended_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status && STATUSES.includes(params.status)) query = query.eq("status", params.status);
  if (params.urgency && URGENCIES.includes(params.urgency)) query = query.eq("urgency", params.urgency);
  if (params.q?.trim()) query = query.ilike("protocol", `%${params.q.trim()}%`);
  if (params.neighborhood?.trim()) query = query.ilike("neighborhood", `%${params.neighborhood.trim()}%`);
  if (params.from) query = query.gte("created_at", `${params.from}T00:00:00`);
  if (params.to) query = query.lte("created_at", `${params.to}T23:59:59.999`);

  const { data, error, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilters = Boolean(params.status || params.urgency || params.q || params.neighborhood || params.from || params.to);
  const base = { q: params.q, status: params.status, urgency: params.urgency, neighborhood: params.neighborhood, from: params.from, to: params.to };

  return <>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">GESTÃO OPERACIONAL</p><h1 className="mt-2 text-3xl font-bold">Denúncias</h1><p className="mt-2 text-sm text-slate-600">Consulte, filtre e acompanhe as ocorrências recebidas pelo Vórtex.</p></div>
      <div className="rounded-xl bg-white px-5 py-3 text-right shadow-sm ring-1 ring-slate-200"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resultados</p><p className="text-2xl font-bold">{total}</p></div>
    </div>

    <form className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">Protocolo<input name="q" defaultValue={params.q} placeholder="Ex.: VTX-2026-000123" className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#0c766d]" /></label>
        <label className="text-xs font-semibold text-slate-600">Bairro<input name="neighborhood" defaultValue={params.neighborhood} placeholder="Buscar bairro" className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#0c766d]" /></label>
        <label className="text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={params.status} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm"><option value="">Todos</option>{STATUSES.map(x=><option key={x} value={x}>{statusLabel(x)}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Urgência<select name="urgency" defaultValue={params.urgency} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm"><option value="">Todas</option>{URGENCIES.map(x=><option key={x} value={x}>{urgencyLabel(x)}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Recebida a partir de<input type="date" name="from" defaultValue={params.from} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Recebida até<input type="date" name="to" defaultValue={params.to} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm" /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="rounded-lg bg-[#0c766d] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#095f58]">Aplicar filtros</button>{activeFilters && <Link href="/admin/denuncias" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Limpar filtros</Link>}</div>
    </form>

    {error ? <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">Não foi possível carregar as denúncias.</p> : rows.length === 0 ? <div className="mt-6 rounded-xl bg-white p-10 text-center ring-1 ring-slate-200"><p className="font-semibold">Nenhuma denúncia encontrada.</p><p className="mt-1 text-sm text-slate-500">Revise os filtros aplicados ou aguarde novos registros.</p></div> : <>
      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Protocolo</th><th>Categoria</th><th>Urgência</th><th>Status</th><th>Bairro</th><th>Responsável</th><th>Recebida</th><th className="pr-4 text-right">Ação</th></tr></thead>
          <tbody>{rows.map((row) => { const assignments = row.vortex_report_assignments as unknown as Array<{ assignee?: { full_name?: string | null } | null }> | null; const responsible = assignments?.[0]?.assignee?.full_name || "Não atribuída"; return <tr className="border-t border-slate-100 transition hover:bg-slate-50/80" key={row.id}>
            <td className="p-4"><Link className="font-bold text-[#0c766d] hover:underline" href={`/admin/denuncias/${row.id}`}>{row.protocol}</Link></td>
            <td>{(row.vortex_categories as {name?:string}|null)?.name || "—"}</td>
            <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass("urgency", row.urgency)}`}>{urgencyLabel(row.urgency)}</span></td>
            <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClass("status", row.status)}`}>{statusLabel(row.status)}</span></td>
            <td>{row.neighborhood || "—"}</td><td className={responsible === "Não atribuída" ? "font-semibold text-amber-700" : ""}>{responsible}</td>
            <td><span className="whitespace-nowrap">{new Date(row.created_at).toLocaleDateString("pt-BR")}</span><br/><span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></td>
            <td className="pr-4 text-right"><Link href={`/admin/denuncias/${row.id}`} className="inline-flex rounded-lg border border-[#0c766d] px-3 py-2 text-xs font-bold text-[#0c766d] hover:bg-[#d8f1ed]">Ver detalhes</Link></td>
          </tr>; })}</tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><p>Mostrando {from + 1}–{Math.min(from + rows.length, total)} de {total}</p><div className="flex items-center gap-2">{page > 1 ? <Link className="rounded-lg border bg-white px-4 py-2 font-semibold hover:bg-slate-50" href={`/admin/denuncias?${queryString({ ...base, page: String(page - 1) })}`}>← Anterior</Link> : <span className="rounded-lg border bg-slate-50 px-4 py-2 text-slate-400">← Anterior</span>}<span className="px-2 font-semibold">Página {page} de {totalPages}</span>{page < totalPages ? <Link className="rounded-lg border bg-white px-4 py-2 font-semibold hover:bg-slate-50" href={`/admin/denuncias?${queryString({ ...base, page: String(page + 1) })}`}>Próxima →</Link> : <span className="rounded-lg border bg-slate-50 px-4 py-2 text-slate-400">Próxima →</span>}</div></div>
    </>}
  </>;
}
