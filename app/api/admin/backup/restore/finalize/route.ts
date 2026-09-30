import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../../lib/supabase/admin";

export const runtime="nodejs";
type Item={id?:unknown;path?:unknown;original_name?:unknown;mime_type?:unknown;size_bytes?:unknown;created_at?:unknown;backed_up_at?:unknown};

async function adminUser(){
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const id=claims?.claims?.sub;if(!id)return null;
  const {data:p}=await supabase.from("vortex_profiles").select("role,active").eq("id",id).maybeSingle();
  return p?.active&&p.role==="ADMIN"?id:null;
}
function uuid(v:unknown){return typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v)?v:null}
function str(v:unknown,max=1000){return typeof v==="string"?v.slice(0,max):null}
function iso(v:unknown){if(typeof v!=="string")return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()}

export async function POST(request:Request){
  const actorId=await adminUser();if(!actorId)return NextResponse.json({error:"Acesso não autorizado."},{status:403});
  let body:{reportId?:unknown;created?:unknown;attachments?:Item[]};
  try{body=await request.json();}catch{return NextResponse.json({error:"Solicitação inválida."},{status:400});}
  const reportId=uuid(body.reportId);if(!reportId)return NextResponse.json({error:"Denúncia inválida."},{status:400});
  const admin=createAdminClient();
  const {data:report}=await admin.from("vortex_reports").select("id,protocol").eq("id",reportId).maybeSingle();
  if(!report)return NextResponse.json({error:"A denúncia restaurada não foi localizada."},{status:404});

  let restored=0;
  for(const item of (body.attachments??[]).slice(0,20)){
    const id=uuid(item.id),path=str(item.path,1000);if(!id||!path)continue;
    const row={
      id,report_id:reportId,storage_path:path,original_name:str(item.original_name,500),
      mime_type:str(item.mime_type,100),size_bytes:Number(item.size_bytes??0),
      created_at:iso(item.created_at)??new Date().toISOString(),
      backed_up_at:iso(item.backed_up_at)??new Date().toISOString(),storage_deleted_at:null,
    };
    const {data:existing}=await admin.from("vortex_attachments").select("id").eq("id",id).maybeSingle();
    const result=existing
      ? await admin.from("vortex_attachments").update(row).eq("id",id)
      : await admin.from("vortex_attachments").insert(row);
    if(result.error)return NextResponse.json({error:`O arquivo foi enviado, mas o registro do anexo ${id} precisa ser revisado.`},{status:500});
    restored+=1;
  }

  await admin.from("vortex_audit_log").insert({
    actor_id:actorId,action:"BACKUP_RESTORED",entity_type:"REPORT",entity_id:reportId,
    metadata:{protocol:report.protocol,report_recreated:Boolean(body.created),restored_attachments:restored},
  });
  return NextResponse.json({restored:true,protocol:report.protocol,restoredAttachments:restored,reportRecreated:Boolean(body.created)});
}
