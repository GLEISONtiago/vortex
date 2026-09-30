import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";

const labels: Record<string,string> = {
  REPORT_CREATED:"Denúncia registrada",
  REPORT_ASSIGNED:"Denúncia atribuída",
  REPORT_REASSIGNED:"Denúncia redistribuída",
  STATUS_CHANGED:"Status alterado",
  REPORT_FINALIZED:"Denúncia finalizada",
  INTERNAL_NOTE_ADDED:"Observação interna registrada",
  STAFF_MESSAGE_SENT:"Mensagem enviada ao denunciante",
  REPORTER_MESSAGE_RECEIVED:"Mensagem recebida do denunciante",
  USER_CREATED:"Usuário criado",
  USER_UPDATED:"Usuário atualizado",
  USER_ACTIVATED:"Usuário ativado",
  USER_DEACTIVATED:"Usuário desativado",
  BACKUP_CONFIRMED:"Backup confirmado",
  STORAGE_CLEANUP:"Limpeza de armazenamento",
};

function detail(action:string, metadata:Record<string,unknown>){
  const protocol=typeof metadata.protocol==="string"?metadata.protocol:null;
  if(action==="STATUS_CHANGED") return `${protocol??"Denúncia"}: ${metadata.old_status??"—"} → ${metadata.new_status??"—"}`;
  if(action==="REPORT_FINALIZED") return `${protocol??"Denúncia"}: finalizada · ${metadata.resolution??"resultado não informado"}`;
  if(action==="REPORT_ASSIGNED"||action==="REPORT_REASSIGNED") return `${protocol??"Denúncia"} · responsável ${String(metadata.assigned_to??"—").slice(0,8)}…`;
  if(protocol) return protocol;
  if(typeof metadata.role==="string") return `Perfil: ${metadata.role}`;
  if(typeof metadata.label==="string") return metadata.label;
  return "";
}

export default async function AuditPage(){
  await requireAdmin();
  const admin=createAdminClient();
  const {data:audit}=await admin.from("vortex_audit_log").select("id,actor_id,action,entity_type,entity_id,metadata,created_at").order("created_at",{ascending:false}).limit(150);
  const rows=audit??[];
  const ids=[...new Set(rows.map(r=>r.actor_id).filter(Boolean))] as string[];
  const {data:profiles}=ids.length?await admin.from("vortex_profiles").select("id,full_name,role").in("id",ids):{data:[]};
  const names=new Map((profiles??[]).map(p=>[p.id,p.full_name||p.role]));
  return <>
    <div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">SEGURANÇA E RASTREABILIDADE</p><h1 className="mt-2 text-3xl font-bold">Auditoria</h1><p className="mt-2 text-sm text-slate-600">Registro cronológico das ações relevantes do VÓRTEX. O conteúdo das mensagens e observações não é copiado para este log.</p></div>
    <div className="mt-7 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      {rows.length?<div className="divide-y divide-slate-100">{rows.map(item=>{const meta=(item.metadata??{}) as Record<string,unknown>;const actor=item.actor_id?(names.get(item.actor_id)||"Usuário do sistema"):(item.action==="REPORTER_MESSAGE_RECEIVED"?"Denunciante":"Sistema");return <article key={item.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_13rem] sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eef9f7] px-2.5 py-1 text-xs font-bold text-[#0c766d]">{labels[item.action]||item.action.replaceAll("_"," ")}</span><span className="text-xs font-semibold text-slate-400">{item.entity_type}</span></div><p className="mt-2 text-sm font-semibold text-slate-700">{detail(item.action,meta)||"Evento registrado pelo sistema"}</p><p className="mt-1 text-xs text-slate-500">Responsável: {actor}</p></div><time className="text-xs text-slate-500 sm:text-right">{new Date(item.created_at).toLocaleString("pt-BR")}</time></article>})}</div>:<p className="p-8 text-center text-sm text-slate-500">Nenhum evento de auditoria registrado.</p>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Exibindo os 150 eventos mais recentes. Registros de auditoria não podem ser alterados pelos perfis operacionais.</p>
  </>;
}
