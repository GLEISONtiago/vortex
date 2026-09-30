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
  supabase.from("vortex_reports").select("id,protocol,urgency,neighborhood,created_at,description,vortex_categories(name)").is("unit_id",null).order("created_at",{ascending:true}),
  supabase.from("vortex_units").select("id,name").eq("active",true).order("name")
 ]);
 return <div className="max-w-6xl">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">DIRETORIA OPERACIONAL</p><h1 className="mt-2 text-3xl font-bold">Triagem geral</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">As novas denúncias chegam sem grupamento definido. A Diretoria analisa cada registro e escolhe manualmente a unidade responsável.</p></div><span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">{reports?.length??0} aguardando triagem</span></div>
  <div className="mt-7 grid gap-4">{(reports??[]).length===0?<div className="rounded-xl bg-white p-8 text-center text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">Nenhuma denúncia aguardando triagem.</div>:(reports??[]).map(report=><article key={report.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/admin/denuncias/${report.id}`} className="font-bold text-[#0c766d]">{report.protocol}</Link><p className="mt-1 text-sm font-semibold">{(report.vortex_categories as {name?:string}|null)?.name||"Sem categoria"} · {urgencyLabel(report.urgency)}</p><p className="mt-1 text-xs text-slate-500">{report.neighborhood||"Bairro não informado"} · {new Date(report.created_at).toLocaleString("pt-BR")}</p></div>{report.urgency==="HIGH"&&<span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">Alta urgência</span>}</div><p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.description}</p><form action={triageReport} className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row"><input type="hidden" name="reportId" value={report.id}/><select required name="unitId" defaultValue="" className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm"><option value="" disabled>Selecionar grupamento responsável</option>{(units??[]).map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select><button className="min-h-11 rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white">Encaminhar</button></form></article>)}</div>
 </div>;
}