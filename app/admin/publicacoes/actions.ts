"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";

const imageBucket="vortex-public-updates";
function value(formData:FormData,key:string){return String(formData.get(key)??"").trim();}
function idValue(formData:FormData){const id=value(formData,"id");return /^[0-9a-f-]{36}$/i.test(id)?id:null;}
function imagePath(raw:string){return /^publicacoes\/\d{4}\/[0-9a-f-]{36}\.webp$/i.test(raw)?raw:null;}
function position(raw:string){const n=Number(raw);return Number.isFinite(n)?Math.min(100,Math.max(0,n)):50;}
function occurred(raw:string){const date=new Date(raw);return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();}
async function audit(actorId:string,action:string,entityId:string,metadata:Record<string,unknown>){
  await createAdminClient().from("vortex_audit_log").insert({actor_id:actorId,action,entity_type:"PUBLIC_UPDATE",entity_id:entityId,metadata});
}
function publicImageUrl(path:string|null){
  if(!path)return null;
  return createAdminClient().storage.from(imageBucket).getPublicUrl(path).data.publicUrl;
}
async function removeStoredImage(path:string|null){
  if(path)await createAdminClient().storage.from(imageBucket).remove([path]);
}

export async function createPublicUpdate(formData:FormData){
  const adminUser=await requireAdmin();
  const title=value(formData,"title").slice(0,160);
  const summary=value(formData,"summary").slice(0,600);
  const content=value(formData,"content");
  const location=value(formData,"location").slice(0,160)||null;
  const rawPath=value(formData,"imagePath");
  const path=imagePath(rawPath);
  if(title.length<3||summary.length<10)throw new Error("Título ou resumo inválido.");
  if(rawPath&&!path)throw new Error("A imagem enviada é inválida.");
  const supabase=createAdminClient();
  const {data,error}=await supabase.from("vortex_public_updates").insert({
    title,summary,content,location,image_url:publicImageUrl(path),image_path:path,image_position_x:position(value(formData,"imagePositionX")),image_position_y:position(value(formData,"imagePositionY")),occurred_at:occurred(value(formData,"occurredAt")),
    published:formData.get("published")==="on",created_by:adminUser.id,updated_at:new Date().toISOString(),
  }).select("id").single();
  if(error||!data){await removeStoredImage(path);throw new Error("Não foi possível criar a publicação.");}
  await audit(adminUser.id,"PUBLIC_UPDATE_CREATED",data.id,{published:formData.get("published")==="on",has_image:Boolean(path)});
  revalidatePath("/");revalidatePath("/admin/publicacoes");
}

export async function updatePublicUpdate(formData:FormData){
  const adminUser=await requireAdmin();const id=idValue(formData);if(!id)throw new Error("Publicação inválida.");
  const title=value(formData,"title").slice(0,160),summary=value(formData,"summary").slice(0,600),content=value(formData,"content");
  const location=value(formData,"location").slice(0,160)||null;
  const rawPath=value(formData,"imagePath"),nextPath=imagePath(rawPath);
  if(title.length<3||summary.length<10)throw new Error("Título ou resumo inválido.");
  if(rawPath&&!nextPath)throw new Error("A imagem enviada é inválida.");
  const supabase=createAdminClient();
  const {data:current}=await supabase.from("vortex_public_updates").select("image_path,image_url").eq("id",id).maybeSingle();
  if(!current)throw new Error("Publicação não encontrada.");
  const submittedUrl=value(formData,"imageUrl");
  const keepLegacyUrl=!nextPath&&!current.image_path&&submittedUrl===String(current.image_url??"");
  const nextUrl=nextPath?publicImageUrl(nextPath):(keepLegacyUrl?current.image_url:null);
  const published=formData.get("published")==="on";
  const {error}=await supabase.from("vortex_public_updates").update({
    title,summary,content,location,image_url:nextUrl,image_path:nextPath,image_position_x:position(value(formData,"imagePositionX")),image_position_y:position(value(formData,"imagePositionY")),occurred_at:occurred(value(formData,"occurredAt")),published,updated_at:new Date().toISOString(),
  }).eq("id",id);
  if(error){
    if(nextPath&&nextPath!==current.image_path)await removeStoredImage(nextPath);
    throw new Error("Não foi possível atualizar a publicação.");
  }
  if(current.image_path&&current.image_path!==nextPath)await removeStoredImage(current.image_path);
  await audit(adminUser.id,"PUBLIC_UPDATE_UPDATED",id,{published,has_image:Boolean(nextUrl)});
  revalidatePath("/");revalidatePath("/admin/publicacoes");
}

export async function deletePublicUpdate(formData:FormData){
  const adminUser=await requireAdmin();const id=idValue(formData);if(!id)throw new Error("Publicação inválida.");
  const supabase=createAdminClient();
  const {data:current}=await supabase.from("vortex_public_updates").select("image_path").eq("id",id).maybeSingle();
  const {error}=await supabase.from("vortex_public_updates").delete().eq("id",id);
  if(error)throw new Error("Não foi possível excluir a publicação.");
  await removeStoredImage(current?.image_path??null);
  await audit(adminUser.id,"PUBLIC_UPDATE_DELETED",id,{});
  revalidatePath("/");revalidatePath("/admin/publicacoes");
}
