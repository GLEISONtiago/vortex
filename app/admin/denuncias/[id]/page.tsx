import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { AssignmentPanel } from "./assignment-panel";
import { historyLabel,resolutionLabel,statusLabel,urgencyLabel } from "../../presentation";
import { AttachmentGallery } from "./attachment-gallery";
import { WorkflowPanel } from "./workflow-panel";

export default async function ReportDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;
 const [{data:report},{data:history},{data:attachments},{data:messages},{data:assignment},{data:candidates},{data:me},{data:myUnits},{data:units}]=await Promise.all([
  supabase.from("vortex_reports").select("*, vortex_categories(name), unit:vortex_units(name)").eq("id",id).maybeSingle(),
  supabase.from("vortex_report_history").select("*").eq("report_id",id).order("created_at",{ascending:false}),
  supabase.from("vortex_attachments").select("*").eq("report_id",id),
  supabase.from("vortex_messages").select("*").eq("report_id",id).order("created_at"),
  supabase.from("vortex_report_assignments").select("assigned_to,assigned_at,assignee:vortex_profiles!vortex_report_assignments_assigned_to_fkey(id,full_name,role,functional_title)").eq("report_id",id).is("ended_at",null).maybeSingle(),
  supabase.rpc("vortex_assignment_candidates",{p_report_id:id}),
  userId?supabase.from("vortex_profiles").select("role").eq("id",userId).maybeSingle():Promise.resolve({data:null}),
  supabase.rpc("vortex_my_units"),
  supabase.from("vortex_units").select("id,name").eq("active",true).order("name"),
 ]);
 if(!report)notFound();
 const admin=createAdminClient();
 const attachmentLinks=await Promise.all((attachments??[]).map(async attachment=>{if(attachment.storage_deleted_at)return{...attachment,signedUrl:null};const {data}=await admin.storage.from("vortex-attachments").createSignedUrl(attachment.storage_path,60*5);return{...attachment,signedUrl:data?.signedUrl??null};}));
 const category=report.vortex_categories as {name?:string}|null;const unit=report.unit as {name?:string}|null;
 const canManage=me?.role==="ADMIN"||me?.role==="COORDENADOR";
 const canRoute=me?.role==="ADMIN"||me?.role==="DIRETORIA";

 return <><Link href="/admin/denuncias" className="text-sm font-bold text-[#0c766d]">← Denúncias</Link>
 <div className="mt-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-[.14em] text-[#0c766d]">{report.protocol}</p><h1 className="mt-1 text-3xl font-bold">Detalhes da denúncia</h1></div><span className="rounded-full bg-[#d8f1ed] px-3 py-1 text-sm font-bold text-[#0c766d]">{statusLabel(report.status)}</span></div>
 <section className="mt-7 grid gap-5 lg:grid-cols-2"><Card title="Identificação"><Item label="Categoria" value={category?.name||"—"}/><Item label="Grupamento" value={unit?.name||"Aguardando triagem da Diretoria"}/><Item label="Urgência" value={urgencyLabel(report.urgency)}/><Item label="Status" value={statusLabel(report.status)}/>{report.status==="FINALIZADA"&&<Item label="Resultado" value={resolutionLabel(report.resolution)}/>}</Card><AssignmentPanel reportId={id} assignment={assignment as never} profiles={(candidates??[]) as never} canManage={canManage} unitId={report.unit_id} unitName={unit?.name||"Aguardando triagem da Diretoria"} units={(units??[]) as never} canRoute={canRoute}/></section>
 <div className="mt-5"><WorkflowPanel reportId={id} currentStatus={report.status}/></div>
 <Card title="Fato" className="mt-5"><p className="whitespace-pre-wrap text-sm leading-6">{report.description}</p></Card>
 <Card title="Histórico" className="mt-5">{history?.length?<ul className="grid gap-3">{history.map(item=><li key={item.id} className="border-l-2 border-[#0c766d] pl-4"><p className="text-sm font-semibold">{historyLabel(item.old_status,item.new_status)}</p>{item.note&&<p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.note}</p>}<p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("pt-BR")}</p></li>)}</ul>:<p className="text-sm text-slate-600">Nenhum histórico disponível.</p>}</Card>
 <Card title="Anexos" className="mt-5"><AttachmentGallery attachments={attachmentLinks.filter(a=>!a.storage_deleted_at&&a.signedUrl).map(a=>({id:a.id,name:a.original_name||"Imagem da denúncia",url:a.signedUrl as string,sizeLabel:a.size_bytes?`${(a.size_bytes/1024/1024).toFixed(2)} MB`:"Tamanho não informado",backedUp:Boolean(a.backed_up_at)}))}/>{attachmentLinks.some(a=>a.storage_deleted_at)&&<p className="mt-3 text-xs text-slate-500">{attachmentLinks.filter(a=>a.storage_deleted_at).length} anexo(s) arquivado(s) em backup externo.</p>}</Card>
 <Card title="Mensagens" className="mt-5">{messages?.length?<ul className="grid gap-3">{messages.map(message=><li key={message.id} className={`max-w-3xl rounded-xl p-3 text-sm ${message.sender_type==="STAFF"?"bg-[#eef9f7]":message.sender_type==="SYSTEM"?"bg-slate-100":"bg-blue-50"}`}><p className="text-xs font-bold text-slate-500">{message.sender_type==="STAFF"?"Equipe Vórtex":message.sender_type==="REPORTER"?"Denunciante":"Sistema"}</p><p className="mt-1 whitespace-pre-wrap">{message.message}</p>{message.created_at&&<p className="mt-2 text-xs text-slate-400">{new Date(message.created_at).toLocaleString("pt-BR")}</p>}</li>)}</ul>:<p className="text-sm text-slate-600">Nenhuma mensagem disponível.</p>}</Card></>;
}
function Card({title,children,className=""}:{title:string;children:ReactNode;className?:string}){return <section className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}><h2 className="font-bold">{title}</h2><div className="mt-4">{children}</div></section>;}
function Item({label,value}:{label:string;value:string}){return <p><span className="text-slate-500">{label}: </span><b>{value}</b></p>;}
