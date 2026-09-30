import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";

export const runtime="nodejs";
const bucket="vortex-attachments";

type Json=Record<string,unknown>;
type RestoreBody={formatVersion?:unknown;report?:Json;history?:Json[];messages?:Json[];assignments?:Json[]};

async function adminUser(){
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const id=claims?.claims?.sub;
  if(!id)return null;
  const {data:p}=await supabase.from("vortex_profiles").select("role,active").eq("id",id).maybeSingle();
  return p?.active&&p.role==="ADMIN"?id:null;
}
function str(v:unknown,max=10000){return typeof v==="string"?v.slice(0,max):null}
function iso(v:unknown){if(typeof v!=="string")return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}
function uuid(v:unknown){return typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v)?v:null}

export async function POST(request:Request){
  const actorId=await adminUser();
  if(!actorId)return NextResponse.json({error:"Acesso não autorizado."},{status:403});
  let body:RestoreBody;
  try{body=await request.json() as RestoreBody;}catch{return NextResponse.json({error:"Backup inválido."},{status:400});}
  const report=body.report??{};
  const protocol=str(report.protocol,80);
  const backupId=uuid(report.id);
  if(!protocol||!/^VTX-[A-Z0-9-]+$/i.test(protocol)||!backupId)return NextResponse.json({error:"Denúncia inválida no backup."},{status:400});

  const admin=createAdminClient();
  const {data:existing}=await admin.from("vortex_reports").select("id,protocol").eq("protocol",protocol).maybeSingle();
  let reportId=existing?.id??backupId;
  let created=false;

  if(!existing){
    if(Number(body.formatVersion??0)<2)return NextResponse.json({error:`O backup antigo de ${protocol} não possui todos os dados necessários para recriar a denúncia. Ele ainda pode restaurar anexos quando a denúncia existir no sistema.`},{status:409});

    let categoryId=uuid(report.category_id);
    if(categoryId){
      const {data:category}=await admin.from("vortex_categories").select("id").eq("id",categoryId).maybeSingle();
      if(!category)categoryId=null;
    }
    if(!categoryId){
      const category=report.vortex_categories;
      const name=Array.isArray(category)?str((category[0] as Json|undefined)?.name,150):str((category as Json|null)?.name,150);
      if(name){
        const {data:found}=await admin.from("vortex_categories").select("id").eq("name",name).maybeSingle();
        categoryId=found?.id??null;
      }
    }

    const status=str(report.status,40);
    const urgency=str(report.urgency,20);
    if(!["NOVA","EM_ANALISE","EM_ATENDIMENTO","FINALIZADA"].includes(status??"")||!["LOW","MEDIUM","HIGH"].includes(urgency??"")){
      return NextResponse.json({error:`Status ou urgência inválidos em ${protocol}.`},{status:400});
    }

    const insert={
      id:backupId,protocol,category_id:categoryId,description:str(report.description,20000)??"",
      urgency,status,resolution:str(report.resolution,80),address:str(report.address,500),neighborhood:str(report.neighborhood,200),
      reference_point:str(report.reference_point,500),latitude:typeof report.latitude==="number"?report.latitude:null,
      longitude:typeof report.longitude==="number"?report.longitude:null,event_at:iso(report.event_at),
      tracking_code_hash:str(report.tracking_code_hash,500),tracking_pin_hash:str(report.tracking_pin_hash,500),
      created_at:iso(report.created_at)??new Date().toISOString(),updated_at:iso(report.updated_at)??new Date().toISOString(),
    };
    const {error:insertError}=await admin.from("vortex_reports").insert(insert);
    if(insertError)return NextResponse.json({error:`Não foi possível recriar ${protocol}.`},{status:500});
    created=true;

    const {error:protocolError}=await admin.from("vortex_reports").update({protocol}).eq("id",backupId);
    if(protocolError){await admin.from("vortex_reports").delete().eq("id",backupId);return NextResponse.json({error:`Não foi possível preservar o protocolo ${protocol}.`},{status:500});}

    await Promise.all([
      admin.from("vortex_report_history").delete().eq("report_id",backupId),
      admin.from("vortex_notifications").delete().eq("report_id",backupId),
      admin.from("vortex_audit_log").delete().eq("entity_id",backupId).eq("action","REPORT_CREATED"),
    ]);

    try{
      const historyActorIds=Array.from(new Set((body.history??[]).map((h)=>uuid(h.changed_by)).filter(Boolean))) as string[];
      const {data:historyProfiles}=historyActorIds.length?await admin.from("vortex_profiles").select("id").in("id",historyActorIds):{data:[] as Array<{id:string}>};
      const validHistoryActors=new Set((historyProfiles??[]).map((p)=>p.id));
      const history=(body.history??[]).slice(0,500).map((h)=>({
        id:uuid(h.id)??undefined,report_id:backupId,old_status:str(h.old_status,40),new_status:str(h.new_status,40)??"NOVA",
        note:str(h.note,4000),changed_by:uuid(h.changed_by)&&validHistoryActors.has(String(h.changed_by))?String(h.changed_by):null,
        created_at:iso(h.created_at)??new Date().toISOString(),
      }));
      if(history.length){const {error}=await admin.from("vortex_report_history").insert(history);if(error)throw error;}

      const messages=(body.messages??[]).slice(0,500).map((m)=>({
        id:uuid(m.id)??undefined,report_id:backupId,sender_type:str(m.sender_type,20)??"SYSTEM",
        message:str(m.message,5000)??"",created_at:iso(m.created_at)??new Date().toISOString(),read_at:iso(m.read_at),
      })).filter((m)=>m.message.trim());
      if(messages.length){const {error}=await admin.from("vortex_messages").insert(messages);if(error)throw error;}
      await admin.from("vortex_audit_log").delete().eq("entity_id",backupId).eq("action","REPORTER_MESSAGE_RECEIVED");

      const profileIds=Array.from(new Set((body.assignments??[]).flatMap((a)=>[uuid(a.assigned_to),uuid(a.assigned_by)]).filter(Boolean))) as string[];
      const {data:profiles}=profileIds.length?await admin.from("vortex_profiles").select("id").in("id",profileIds):{data:[] as Array<{id:string}>};
      const valid=new Set((profiles??[]).map((p)=>p.id));
      const assignments=(body.assignments??[]).slice(0,200).filter((a)=>uuid(a.assigned_to)&&valid.has(String(a.assigned_to))).map((a)=>({
        id:uuid(a.id)??undefined,report_id:backupId,assigned_to:String(a.assigned_to),
        assigned_by:uuid(a.assigned_by)&&valid.has(String(a.assigned_by))?String(a.assigned_by):null,
        assigned_at:iso(a.assigned_at)??new Date().toISOString(),ended_at:iso(a.ended_at),note:str(a.note,2000),
        created_at:iso(a.created_at)??iso(a.assigned_at)??new Date().toISOString(),
      }));
      if(assignments.length){const {error}=await admin.from("vortex_report_assignments").insert(assignments);if(error)throw error;}
    }catch{
      await admin.from("vortex_reports").delete().eq("id",backupId);
      return NextResponse.json({error:`A restauração de ${protocol} foi revertida porque o histórico não pôde ser validado.`},{status:500});
    }
  }

  const attachments=Array.isArray(report.attachments)?report.attachments as Json[]:[];
  const {data:current}=await admin.from("vortex_attachments").select("id,storage_path,storage_deleted_at").eq("report_id",reportId);
  const uploads:Array<Record<string,unknown>>=[];

  for(const item of attachments.slice(0,20)){
    const backupFile=str(item.backup_file,500);
    const path=str(item.storage_path,1000);
    if(!backupFile||!path)continue;
    const currentRow=(current??[]).find((row)=>row.id===item.id||row.storage_path===path);
    if(currentRow&&!currentRow.storage_deleted_at)continue;
    const {data:signed,error}=await admin.storage.from(bucket).createSignedUploadUrl(path,{upsert:true});
    if(error||!signed?.token)return NextResponse.json({error:`Não foi possível preparar o anexo de ${protocol}.`},{status:500});
    uploads.push({
      backupFile,path,token:signed.token,id:currentRow?.id??uuid(item.id)??crypto.randomUUID(),
      original_name:str(item.original_name,500),mime_type:str(item.mime_type,100)??"image/webp",
      size_bytes:typeof item.size_bytes==="number"?item.size_bytes:Number(item.size_bytes??0),
      created_at:iso(item.created_at),backed_up_at:iso(item.backed_up_at),
    });
  }

  return NextResponse.json({reportId,protocol,created,uploads});
}
