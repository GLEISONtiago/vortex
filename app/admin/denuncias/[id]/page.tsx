import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { AssignmentPanel } from "./assignment-panel";
import { historyLabel,resolutionLabel,statusLabel,urgencyLabel } from "../../presentation";
import { AttachmentGallery } from "./attachment-gallery";
import { WorkflowPanel } from "./workflow-panel";
import { ReportServiceFlow } from "./report-service-flow";

export default async function ReportDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;
 const [{data:report},{data:history},{data:attachments},{data:messages},{data:assignment},{data:candidates},{data:me},{data:units}]=await Promise.all([
  supabase.from("vortex_reports").select("*, vortex_categories(name), unit:vortex_units(name)").eq("id",id).maybeSingle(),
  supabase.from("vortex_report_history").select("*").eq("report_id",id).order("created_at",{ascending:false}),
  supabase.from("vortex_attachments").select("*").eq("report_id",id),
  supabase.from("vortex_messages").select("*").eq("report_id",id).order("created_at"),
  supabase.from("vortex_report_assignments").select("assigned_to,assigned_at,assignee:vortex_profiles!vortex_report_assignments_assigned_to_fkey(id,full_name,role,functional_title)").eq("report_id",id).is("ended_at",null).maybeSingle(),
  supabase.rpc("vortex_assignment_candidates",{p_report_id:id}),
  userId?supabase.from("vortex_profiles").select("role").eq("id",userId).maybeSingle():Promise.resolve({data:null}),
  supabase.from("vortex_units").select("id,name").eq("active",true).order("name"),
 ]);
 if(!report)notFound();
 const admin=createAdminClient();
 const attachmentLinks=await Promise.all((attachments??[]).map(async attachment=>{if(attachment.storage_deleted_at)return{...attachment,signedUrl:null};const {data}=await admin.storage.from("vortex-attachments").createSignedUrl(attachment.storage_path,60*5);return{...attachment,signedUrl:data?.signedUrl??null};}));
 const category=report.vortex_categories as {name?:string}|null;const unit=report.unit as {name?:string}|null;
 const canManage=me?.role==="COORDENADOR";
 const canRoute=me?.role==="DIRETORIA";
 const canReturn=me?.role==="COORDENADOR";
 const canUpdateStatus=!["DIRETORIA","INTELIGENCIA"].includes(me?.role||"");
 const activeAttachments=attachmentLinks.filter(a=>!a.storage_deleted_at&&a.signedUrl);

 const overview=<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
  <div className="grid gap-6 lg:grid-cols-2">
   <div><h3 className="font-bold text-[#102b42]">Informações recebidas</h3><div className="mt-4 grid gap-2 text-sm"><Item label="Categoria" value={category?.name||"—"}/><Item label="Urgência" value={urgencyLabel(report.urgency)}/><Item label="Status atual" value={statusLabel(report.status)}/><Item label="Grupamento" value={unit?.name||"Aguardando triagem da Diretoria"}/>{report.event_at&&<Item label="Data do fato" value={formatDateTime(report.event_at)}/>}</div></div>
   <div><h3 className="font-bold text-[#102b42]">Local informado</h3><div className="mt-4 grid gap-2 text-sm"><Item label="Endereço" value={report.address||"Não informado"}/><Item label="Bairro" value={report.neighborhood||"Não informado"}/><Item label="Referência" value={report.reference_point||"Não informada"}/></div></div>
  </div>
  <div className="mt-6 border-t border-slate-200 pt-6"><h3 className="font-bold text-[#102b42]">Descrição do fato</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.description}</p></div>
  <div className="mt-6 border-t border-slate-200 pt-6"><h3 className="font-bold text-[#102b42]">Dados do denunciante</h3>{report.reporter_name||report.reporter_phone||report.reporter_email?<div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><Item label="Nome" value={report.reporter_name||"Não informado"}/><Item label="Telefone" value={report.reporter_phone||"Não informado"}/><Item label="E-mail" value={report.reporter_email||"Não informado"}/></div>:<p className="mt-2 text-sm text-slate-600">Denúncia enviada de forma anônima.</p>}</div>
  <div className="mt-6 border-t border-slate-200 pt-6"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#102b42]">Anexos</h3><span className="text-xs text-slate-500">{activeAttachments.length} imagem(ns)</span></div><div className="mt-3"><AttachmentGallery attachments={activeAttachments.map(a=>({id:a.id,name:a.original_name||"Imagem da denúncia",url:a.signedUrl as string,sizeLabel:a.size_bytes?`${(a.size_bytes/1024/1024).toFixed(2)} MB`:"Tamanho não informado",backedUp:Boolean(a.backed_up_at)}))}/></div>{attachmentLinks.some(a=>a.storage_deleted_at)&&<p className="mt-3 text-xs text-slate-500">{attachmentLinks.filter(a=>a.storage_deleted_at).length} anexo(s) arquivado(s) em backup externo.</p>}</div>
 </section>;

 const routing=<AssignmentPanel reportId={id} assignment={assignment as never} profiles={(candidates??[]) as never} canManage={canManage} unitId={report.unit_id} unitName={unit?.name||"Aguardando triagem da Diretoria"} units={(units??[]) as never} canRoute={canRoute} canReturn={canReturn}/>;
 const andamento=<WorkflowPanel reportId={id} currentStatus={report.status} canUpdateStatus={canUpdateStatus} unitName={unit?.name||null} mode="status"/>;
 const communication=<WorkflowPanel reportId={id} currentStatus={report.status} canUpdateStatus={canUpdateStatus} unitName={unit?.name||null} mode="message"/>;
 const historyContent=<section className="grid gap-5 lg:grid-cols-2">
  <Card title="Histórico do atendimento">{history?.length?<ul className="grid gap-3">{history.map(item=><li key={item.id} className="border-l-2 border-[#0c766d] pl-4"><p className="text-sm font-semibold">{historyLabel(item.old_status,item.new_status)}</p>{item.note&&<p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.note}</p>}<p className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</p></li>)}</ul>:<p className="text-sm text-slate-600">Nenhum histórico disponível.</p>}</Card>
  <Card title="Comunicações">{messages?.length?<ul className="grid gap-3">{messages.map(message=><li key={message.id} className={`rounded-xl p-3 text-sm ${message.sender_type==="STAFF"?"bg-[#eef9f7]":message.sender_type==="SYSTEM"?"bg-slate-100":"bg-blue-50"}`}><p className="text-xs font-bold text-slate-500">{message.sender_type==="STAFF"?"Equipe Vórtex":message.sender_type==="REPORTER"?"Denunciante":"Sistema"}</p><p className="mt-1 whitespace-pre-wrap">{message.message}</p>{message.created_at&&<p className="mt-2 text-xs text-slate-400">{formatDateTime(message.created_at)}</p>}</li>)}</ul>:<p className="text-sm text-slate-600">Nenhuma mensagem disponível.</p>}</Card>
 </section>;

 return <><Link href="/admin/denuncias" className="text-sm font-bold text-[#0c766d]">← Denúncias</Link><ReportServiceFlow protocol={report.protocol} statusLabel={statusLabel(report.status)} overview={overview} routing={routing} andamento={andamento} communication={communication} history={historyContent}/></>;
}
function Card({title,children}:{title:string;children:ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold text-[#102b42]">{title}</h3><div className="mt-4">{children}</div></section>;}
function Item({label,value}:{label:string;value:string}){return <p><span className="text-slate-500">{label}: </span><b>{value}</b></p>;}
function formatDateTime(value:string){return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(value));}
