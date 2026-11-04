import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { statusLabel, urgencyLabel } from "./presentation";
export default async function AdminPage() {
 const supabase = await createClient();
 const statuses = ["NOVA", "ENCAMINHADA", "EM_ANALISE", "EM_ATENDIMENTO", "FINALIZADA"];
 const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
 }).formatToParts(new Date());
 const part = (type: string) => parts.find(item => item.type === type)?.value || "";
 const today = `${part("year")}-${part("month")}-${part("day")}`;
 const tomorrow = new Date(Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")) + 1)).toISOString().slice(0, 10);
 const countReports = () => supabase.from("vortex_reports").select("id", { count: "exact", head: true });
 const [sample, totalResult, todayResult, triageResult, waitingResult, openResult, highResult, handlingResult, completedResult, ...statusResults] = await Promise.all([
  supabase.from("vortex_reports").select("id, protocol, status, urgency, unit_id, awaiting_reporter_info, neighborhood, created_at, vortex_categories(name)").order("created_at", { ascending: false }).limit(500),
  countReports(),
  countReports().gte("created_at", `${today}T00:00:00-03:00`).lt("created_at", `${tomorrow}T00:00:00-03:00`),
  countReports().is("unit_id", null).eq("awaiting_reporter_info", false).neq("status", "FINALIZADA"),
  countReports().eq("awaiting_reporter_info", true).neq("status", "FINALIZADA"),
  countReports().neq("status", "FINALIZADA"),
  countReports().eq("urgency", "HIGH").neq("status", "FINALIZADA"),
  countReports().eq("status", "EM_ATENDIMENTO"),
  countReports().eq("status", "FINALIZADA"),
  ...statuses.map(status => countReports().eq("status", status)),
 ]);
 const error = sample.error || [totalResult, todayResult, triageResult, waitingResult, openResult, highResult, handlingResult, completedResult, ...statusResults].find(item => item.error)?.error;
 const rows = sample.data ?? [];
 const total = totalResult.count ?? 0;
 const todayCount = todayResult.count ?? 0;
 const triageCount = triageResult.count ?? 0;
 const waitingCount = waitingResult.count ?? 0;
 const openCount = openResult.count ?? 0;
 const highCount = highResult.count ?? 0;
 const handlingCount = handlingResult.count ?? 0;
 const completedCount = completedResult.count ?? 0;
 const statusCounts = new Map(statuses.map((status, index) => [status, statusResults[index]?.count ?? 0]));
 const recent = rows.slice(0, 8);
 const categoryCounts = new Map<string, number>();
 const neighborhoodCounts = new Map<string, number>();
 rows.forEach(r => {
  const cat = (r.vortex_categories as { name?: string } | null)?.name || "Sem categoria";
  categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  const n = r.neighborhood || "Não informado";
  neighborhoodCounts.set(n, (neighborhoodCounts.get(n) || 0) + 1);
 });
 const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
 const topNeighborhoods = [...neighborhoodCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
 return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">CENTRAL OPERACIONAL</p><h1 className="mt-2 text-3xl font-bold">Visão geral</h1><p className="mt-2 text-sm text-slate-600">Resumo do fluxo operacional e das denúncias que exigem atenção.</p></div><Link href="/admin/denuncias" className="rounded-lg bg-[#0c766d] px-5 py-3 text-sm font-bold text-white">Central de denúncias</Link></div>{error ? <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">Não foi possível carregar as denúncias.</p> : <><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Recebidas hoje" value={todayCount} detail="novos registros no dia" /><Metric label="Triagem pendente" value={triageCount} detail="aguardando decisão da triagem" tone="amber" /><Metric label="Aguardando complemento" value={waitingCount} detail="dependem de resposta do denunciante" tone="amber" /><Metric label="Em aberto" value={openCount} detail="aguardando conclusão" /><Metric label="Alta urgência" value={highCount} detail="abertas e prioritárias" tone="red" /><Metric label="Em atendimento" value={handlingCount} detail="em andamento" tone="amber" /><Metric label="Finalizadas" value={completedCount} detail="atendimentos encerrados" tone="green" /></div><div className="mt-7 grid gap-5 lg:grid-cols-2"><Ranking title="Categorias recorrentes (até 500 registros recentes)" items={topCategories} /><Ranking title="Bairros com registros (até 500 recentes)" items={topNeighborhoods} /></div><section className="mt-7 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Situação das denúncias</h2><p className="mt-1 text-sm text-slate-500">{total} denúncia(s) visível(is)</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["NOVA","ENCAMINHADA","EM_ANALISE","EM_ATENDIMENTO","FINALIZADA"].map(status => { const count=statusCounts.get(status) ?? 0; const pct=total?Math.round(count/total*100):0; return <Link key={status} href={`/admin/denuncias?status=${status}`} className="rounded-xl border border-slate-200 p-4 hover:border-[#0c766d]"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{statusLabel(status)}</span><b className="text-2xl">{count}</b></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0c766d]" style={{width:`${pct}%`}} /></div><p className="mt-2 text-xs text-slate-500">{pct}% do total</p></Link>})}</div></section><section className="mt-9"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Denúncias recentes</h2><Link className="text-sm font-bold text-[#0c766d]" href="/admin/denuncias">Ver todas</Link></div>{recent.length === 0 ? <p className="mt-4 rounded-xl bg-white p-6 text-sm text-slate-600">Nenhuma denúncia visível para seu perfil.</p> : <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Protocolo</th><th>Categoria</th><th>Urgência</th><th>Status</th><th>Bairro</th></tr></thead><tbody>{recent.map((row) => <tr key={row.id} className="border-t"><td className="p-4 font-bold text-[#0c766d]"><Link href={`/admin/denuncias/${row.id}`}>{row.protocol}</Link></td><td>{(row.vortex_categories as { name?: string } | null)?.name || "—"}</td><td>{urgencyLabel(row.urgency)}</td><td>{statusLabel(row.status)}</td><td>{row.neighborhood || "—"}</td></tr>)}</tbody></table></div>}</section></>}</>;
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: number; detail: string; tone?: string }) { const cls = tone === "red" ? "border-red-200 bg-red-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "green" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"; return <div className={`rounded-xl border p-5 shadow-sm ${cls}`}><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
function Ranking({ title, items }: { title: string; items: Array<[string, number]> }) { const max=items[0]?.[1]||1; return <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-bold">{title}</h2><div className="mt-5 grid gap-4">{items.length ? items.map(([name,count])=><div key={name}><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{name}</span><b>{count}</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0c766d]" style={{width:`${Math.max(5,Math.round(count/max*100))}%`}} /></div></div>) : <p className="text-sm text-slate-500">Sem dados suficientes.</p>}</div></section>; }
