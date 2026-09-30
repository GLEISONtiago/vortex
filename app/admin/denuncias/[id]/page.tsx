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
import { FinalizationPanel } from "./finalization-panel";

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
 const role=me?.role||"";
 const isAssignedToMe=Boolean(userId&&assignment?.assigned_to===userId);
 const canManage=role==="COORDENADOR";
 const canRoute=role==="DIRETORIA";
 const canReturn=role==="COORDENADOR";
 const canUpdateStatus=role==="COORDENADOR"||(["OPERADOR","AGENTE","ANALISTA"].includes(role)&&isAssignedToMe);
 const canFinalize=canUpdateStatus;
 const activeAttachments=attachmentLinks.filter(a=>!a.storage_deleted_at&&a.signedUrl);
 const allMessages=messages??[];
 const staffMessages=allMessages.filter(m=>m.sender_type==="STAFF");
 const reporterMessages=allMessages.filter(m=>m.sender_type==="REPORTER");
 const lastStaff=staffMessages.at(-1);
 const lastReporter=reporterMessages.at(-1);
 const latestReporterReply=Boolean(lastReporter&&(!lastStaff||new Date(lastReporter.created_at).getTime()>new Date(lastStaff.created_at).getTime()));
 const hasServiceNote=(history??[]).some(item=>item.old_status===item.new_status&&Boolean(item.note));
 const routingComplete=role==="DIRETORIA"?Boolean(report.unit_id):role==="COORDENADOR"?Boolean(assignment):Boolean(assignment||report.unit_id);
 const completed=[true,routingComplete,report.status==="FINALIZADA"||hasServiceNote,staffMessages.length>0,report.status==="FINALIZADA"];
 let initialStep=0;
 if(report.status==="FINALIZADA")initialStep=4;
 else if(latestReporterReply||report.awaiting_reporter_info)initialStep=3;
 else if(!report.unit_id)initialStep=canRoute?1:0;
 else if(!assignment)initialStep=canManage?1:0;
 else initialStep=2;
 const missing:string[]=[];
 if(!report.reference_point)missing.push("um ponto de referência");
 if(report.latitude==null||report.longitude==null)missing.push("a confirmação mais precisa do local");
 if((report.description||"").trim().length<120)missing.push("mais detalhes sobre como o fato ocorreu");
 if(activeAttachments.length===0)missing.push("uma foto ou outro registro visual, se houver");
 const contextualMessage=missing.length?`Para dar continuidade à análise, precisamos de ${joinNatural(missing)}. Você pode responder por este acompanhamento com as informações que tiver disponíveis.`:"Caso possua alguma informação nova que possa auxiliar a averiguação, você pode enviá-la por este acompanhamento.";
 const alerts:string[]=[];
 if(report.awaiting_reporter_info)alerts.push("Aguardando complemento do denunciante. O indicador será retirado automaticamente quando houver nova resposta.");
 if(latestReporterReply)alerts.push("Nova resposta do denunciante recebida. Revise a etapa Comunicação.");
 if(!report.operational_priority&&canRoute)alerts.push("A prioridade operacional ainda não foi definida pela Diretoria.");
 const priorityLabel=report.operational_priority?urgencyLabel(report.operational_priority):"Não definida";

 const overview=<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
  <div className="mb-6 grid gap-3 sm:grid-cols-3"><Metric label={report.unit_id?"Recebida":"Aguardando triagem"} value={relativeTime(report.created_at)}/><Metric label="Urgência informada" value={urgencyLabel(report.urgency)}/><Metric label="Prioridade operacional" value={priorityLabel}/></div>
  {assignment&&<p className="mb-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">Responsável atribuído <b>{relativeTime(assignment.assigned_at)}</b>.</p>}
  <div className="grid gap-6 lg:grid-cols-2">
   <div><h3 className="font-bold text-[#102b42]">Informações recebidas</h3><div className="mt-4 grid gap-2 text-sm"><Item label="Categoria" value={category?.name||"—"}/><Item label="Urgência" value={urgencyLabel(report.urgency)}/><Item label="Status atual" value={statusLabel(report.status)}/><Item label="Grupamento" value={unit?.name||"Aguardando triagem da Diretoria"}/>{report.event_at&&<Item label="Data do fato" value={formatDateTime(report.event_at)}/>}</div></div>
   <div><h3 className="font-bold text-[#102b42]">Local informado</h3><div className="mt-4 grid gap-2 text-sm"><Item label="Endereço" value={report.address||"Não informado"}/><Item label="Bairro" value={report.neighborhood||"Não informado"}/><Item label="Referência" value={report.reference_point||"Não informada"}/></div></div>
  </div>
  <div className="mt-6 border-t border-slate-200 pt-6"><h3 className="font-bold text-[#102b42]">Descrição do fato</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.description}</p></div>
  <div className="mt-6 border-t border-slate-200 pt-6"><h3 className="font-bold text-[#102b42]">Dados do denunciante</h3>{report.reporter_name||report.reporter_phone||report.reporter_email?<div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><Item label="Nome" value={report.reporter_name||"Não informado"}/><Item label="Telefone" value={report.reporter_phone||"Não informado"}/><Item label="E-mail" value={report.reporter_email||"Não informado"}/></div>:<p className="mt-2 text-sm text-slate-600">Denúncia enviada de forma anônima.</p>}</div>
  <div className="mt-6 border-t border-slate-200 pt-6"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-[#102b42]">Anexos</h3><span className="text-xs text-slate-500">{activeAttachments.length} imagem(ns)</span></div><div className="mt-3"><AttachmentGallery attachments={activeAttachments.map(a=>({id:a.id,name:a.original_name||"Imagem da denúncia",url:a.signedUrl as string,sizeLabel:a.size_bytes?`${(a.size_bytes/1024/1024).toFixed(2)} MB`:"Tamanho não informado",backedUp:Boolean(a.backed_up_at)}))}/></div>{attachmentLinks.some(a=>a.storage_deleted_at)&&<p className="mt-3 text-xs text-slate-500">{attachmentLinks.filter(a=>a.storage_deleted_at).length} anexo(s) arquivado(s) em backup externo.</p>}</div>
 </section>;

 const routing=<AssignmentPanel reportId={id} assignment={assignment as never} profiles={(candidates??[]) as never} canManage={canManage} unitId={report.unit_id} unitName={unit?.name||"Aguardando triagem da Diretoria"} units={(units??[]) as never} canRoute={canRoute} canReturn={canReturn} operationalPriority={report.operational_priority}/>;
 const handling=<WorkflowPanel reportId={id} currentStatus={report.status} canUpdateStatus={canUpdateStatus} unitName={unit?.name||null} mode="status"/>;
 const communication=<WorkflowPanel reportId={id} currentStatus={report.status} canUpdateStatus={canUpdateStatus} unitName={unit?.name||null} mode="message" contextSuggestions={[contextualMessage]} awaitingReporterInfo={Boolean(report.awaiting_reporter_info)} latestReporterReply={latestReporterReply}/>;
 const finalization=<FinalizationPanel reportId={id} currentStatus={report.status} currentResolution={report.resolution} forwardedAgency={report.forwarded_agency} canFinalize={canFinalize}/>;
 const historyContent=<section className="grid gap-5 lg:grid-cols-2">
  <Card title="Histórico do atendimento">{history?.length?<ul className="grid gap-3">{history.map(item=><li key={item.id} className="border-l-2 border-[#0c766d] pl-4"><p className="text-sm font-semibold">{historyLabel(item.old_status,item.new_status)}</p>{item.note&&<p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.note}</p>}<p className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</p></li>)}</ul>:<p className="text-sm text-slate-600">Nenhum histórico disponível.</p>}</Card>
  <Card title="Comunicações">{allMessages.length?<ul className="grid gap-3">{allMessages.map(message=><li key={message.id} className={`rounded-xl p-3 text-sm ${message.sender_type==="STAFF"?"bg-[#eef9f7]":message.sender_type==="SYSTEM"?"bg-slate-100":"bg-blue-50"}`}><p className="text-xs font-bold text-slate-500">{message.sender_type==="STAFF"?"Equipe Vórtex":message.sender_type==="REPORTER"?"Denunciante":"Sistema"}</p><p className="mt-1 whitespace-pre-wrap">{message.message}</p>{message.created_at&&<p className="mt-2 text-xs text-slate-400">{formatDateTime(message.created_at)}</p>}</li>)}</ul>:<p className="text-sm text-slate-600">Nenhuma mensagem disponível.</p>}</Card>
 </section>;

 return <><Link href="/admin/denuncias" className="text-sm font-bold text-[#0c766d]">← Denúncias</Link><ReportServiceFlow protocol={report.protocol} statusLabel={statusLabel(report.status)} overview={overview} routing={routing} handling={handling} communication={communication} finalization={finalization} history={historyContent} initialStep={initialStep} completed={completed} alerts={alerts}/></>;
}
function Card({title,children}:{title:string;children:ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-bold text-[#102b42]">{title}</h3><div className="mt-4">{children}</div></section>;}
function Item({label,value}:{label:string;value:string}){return <p><span className="text-slate-500">{label}: </span><b>{value}</b></p>;}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-[#102b42]">{value}</p></div>;}
function formatDateTime(value:string){return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(value));}

function relativeTime(value:string){const ms=Date.now()-new Date(value).getTime();const mins=Math.max(0,Math.floor(ms/60000));if(mins<60)return mins<=1?"há 1 min":`há ${mins} min`;const hours=Math.floor(mins/60);if(hours<24)return `há ${hours}h`;const days=Math.floor(hours/24);return `há ${days} dia${days===1?"":"s"}`;}
function joinNatural(items:string[]){if(items.length<=1)return items[0]||"";if(items.length===2)return `${items[0]} e ${items[1]}`;return `${items.slice(0,-1).join(", ")} e ${items.at(-1)}`;}
