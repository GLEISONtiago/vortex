import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { urgencyLabel } from "../presentation";
import { triageReport } from "./actions";

export default async function TriagePage(){
 const supabase=await createClient();
 const {data:claims}=await supabase.auth.getClaims();
 const id=claims?.claims?.sub;
 if(!id)redirect("/login");
 const {data:me}=await supabase.from("vortex_profiles").select("role,active").eq("id",id).maybeSingle();
 if(!me?.active||!["ADMIN","DIRETORIA"].includes(me.role))redirect("/admin");
 const [{data:reports},{data:units}]=await Promise.all([
  supabase.from("vortex_reports").select("id,protocol,urgency,neighborhood,created_at,description,awaiting_reporter_info,vortex_categories(name)").is("unit_id",null).order("created_at",{ascending:true}),
  supabase.from("vortex_units").select("id,name").eq("active",true).order("name")
 ]);
 return <div className="max-w-6xl">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">TRIAGEM OPERACIONAL</p><h1 className="mt-2 text-3xl font-bold">Triagem</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Revise cada denúncia, solicite complemento quando necessário ou defina a prioridade e encaminhe para a chefia responsável.</p></div><span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">{reports?.length??0} aguardando triagem</span></div>
  <div className="mt-7 grid gap-4">{(reports??[]).length===0?<div className="rounded-xl bg-white p-8 text-center text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">Nenhuma denúncia aguardando triagem.</div>:(reports??[]).map(report=><article key={report.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/admin/denuncias/${report.id}`} className="font-bold text-[#0c766d]">{report.protocol}</Link><p className="mt-1 text-sm font-semibold">{(report.vortex_categories as {name?:string}|null)?.name||"Sem categoria"} · {urgencyLabel(report.urgency)}</p><p className="mt-1 text-xs text-slate-500">{report.neighborhood||"Bairro não informado"} · {new Date(report.created_at).toLocaleString("pt-BR")}</p></div>{report.urgency==="HIGH"&&<span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">Alta urgência</span>}</div><p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.description}</p>{report.awaiting_reporter_info?<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><p className="text-sm font-bold text-amber-800">Aguardando complemento do denunciante</p><p className="mt-1 text-xs text-slate-500">A triagem volta a ficar disponível quando houver resposta.</p></div><Link href={`/admin/denuncias/${report.id}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-[#102b42]">Abrir acompanhamento</Link></div>:<><form action={triageReport} className="mt-5 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[180px_1fr_auto]"><input type="hidden" name="reportId" value={report.id}/><select required name="priority" defaultValue="" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"><option value="" disabled>Prioridade</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select><select required name="unitId" defaultValue="" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"><option value="" disabled>Selecionar grupamento / chefia</option>{(units??[]).map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button className="min-h-11 rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white">Classificar e encaminhar</button></form><div className="mt-3 text-right"><Link href={`/admin/denuncias/${report.id}`} className="text-sm font-bold text-[#0c766d] hover:underline">Revisar detalhes ou solicitar complemento →</Link></div></>}</article>)}</div>
 </div>;
}