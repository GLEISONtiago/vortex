"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";

function value(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function idValue(formData:FormData){const id=value(formData,"id");return /^[0-9a-f-]{36}$/i.test(id)?id:null;}
function imageUrl(raw:string){if(!raw)return null;try{const url=new URL(raw);return url.protocol==="https:"?url.toString().slice(0,1200):null}catch{return null}}
function occurred(raw:string){const date=new Date(raw);return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();}
async function audit(actorId:string,action:string,entityId:string,metadata:Record<string,unknown>){
  await createAdminClient().from("vortex_audit_log").insert({actor_id:actorId,action,entity_type:"PUBLIC_UPDATE",entity_id:entityId,metadata});
}

export async function createPublicUpdate(formData:FormData){
  const adminUser=await requireAdmin();
  const title=value(formData,"title").slice(0,160);
  const summary=value(formData,"summary").slice(0,600);
  const location=value(formData,"location").slice(0,160)||null;
  const rawImage=value(formData,"imageUrl");
  const url=imageUrl(rawImage);
  if(title.length<3||summary.length<10)throw new Error("Título ou resumo inválido.");
  if(rawImage&&!url)throw new Error("A imagem deve usar uma URL HTTPS válida.");
  const supabase=createAdminClient();
  const {data,error}=await supabase.from("vortex_public_updates").insert({
    title,summary,location,image_url:url,occurred_at:occurred(value(formData,"occurredAt")),
    published:formData.get("published")==="on",created_by:adminUser.id,updated_at:new Date().toISOString(),
  }).select("id").single();
  if(error||!data)throw new Error("Não foi possível criar a publicação.");
  await audit(adminUser.id,"PUBLIC_UPDATE_CREATED",data.id,{published:formData.get("published")==="on"});
  revalidatePath("/");revalidatePath("/admin/publicacoes");
}

export async function updatePublicUpdate(formData:FormData){
  const adminUser=await requireAdmin();const id=idValue(formData);if(!id)throw new Error("Publicação inválida.");
  const title=value(formData,"title").slice(0,160),summary=value(formData,"summary").slice(0,600);
  const location=value(formData,"location").slice(0,160)||null,rawImage=value(formData,"imageUrl"),url=imageUrl(rawImage);
  if(title.length<3||summary.length<10)throw new Error("Título ou resumo inválido.");
  if(rawImage&&!url)throw new Error("A imagem deve usar uma URL HTTPS válida.");
  const published=formData.get("published")==="on";
  const {error}=await createAdminClient().from("vortex_public_updates").update({
    title,summary,location,image_url:url,occurred_at:occurred(value(formData,"occurredAt")),published,updated_at:new Date().toISOString(),
  }).eq("id",id);
  if(error)throw new Error("Não foi possível atualizar a publicação.");
  await audit(adminUser.id,"PUBLIC_UPDATE_UPDATED",id,{published});
  revalidatePath("/");revalidatePath("/admin/publicacoes");
}

export async function deletePublicUpdate(formData:FormData){
  const adminUser=await requireAdmin();const id=idValue(formData);if(!id)throw new Error("Publicação inválida.");
  const {error}=await createAdminClient().from("vortex_public_updates").delete().eq("id",id);
  if(error)throw new Error("Não foi possível excluir a publicação.");
  await audit(adminUser.id,"PUBLIC_UPDATE_DELETED",id,{});
  revalidatePath("/");revalidatePath("/admin/publicacoes");
}
