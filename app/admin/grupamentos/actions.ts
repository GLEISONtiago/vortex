"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";
function value(fd:FormData,key:string){return String(fd.get(key)??"").trim();}
function uuid(v:string){return /^[0-9a-f-]{36}$/i.test(v)?v:null;}
async function audit(actor:string,action:string,entity:string,metadata:Record<string,unknown>){await createAdminClient().from("vortex_audit_log").insert({actor_id:actor,action,entity_type:"UNIT",entity_id:entity,metadata});}

export async function createUnit(fd:FormData){
 const me=await requireAdmin();const name=value(fd,"name").slice(0,120);const code=value(fd,"code").toUpperCase().replace(/[^A-Z0-9_]/g,"_").slice(0,40);const description=value(fd,"description").slice(0,500)||null;
 if(name.length<2||code.length<2)throw new Error("Nome ou código inválido.");
 const {data,error}=await createAdminClient().from("vortex_units").insert({name,code,description}).select("id").single();if(error||!data)throw new Error("Não foi possível criar o grupamento.");
 await audit(me.id,"UNIT_CREATED",data.id,{code,name});revalidatePath("/admin/grupamentos");
}
export async function saveMember(fd:FormData){
 const me=await requireAdmin();const unitId=uuid(value(fd,"unitId")),profileId=uuid(value(fd,"profileId")),memberRole=value(fd,"memberRole");const canTriage=fd.get("canTriage")==="on";
 if(!unitId||!profileId||!["COORDENADOR","INSPETOR"].includes(memberRole))throw new Error("Vínculo inválido.");
 const admin=createAdminClient();const {data:profile}=await admin.from("vortex_profiles").select("role,active").eq("id",profileId).maybeSingle();
 if(!profile?.active)throw new Error("Usuário inativo.");
 if(memberRole==="COORDENADOR"&&profile.role!=="COORDENADOR")throw new Error("Selecione um usuário com perfil Coordenador.");
 if(memberRole==="INSPETOR"&&profile.role!=="OPERADOR")throw new Error("Selecione um usuário com perfil Operador.");
 const {error}=await admin.from("vortex_unit_members").upsert({unit_id:unitId,profile_id:profileId,member_role:memberRole,can_triage:memberRole==="COORDENADOR"&&canTriage},{onConflict:"unit_id,profile_id"});
 if(error)throw new Error("Não foi possível salvar o vínculo.");
 await audit(me.id,"UNIT_MEMBER_SAVED",unitId,{profile_id:profileId,member_role:memberRole,can_triage:memberRole==="COORDENADOR"&&canTriage});revalidatePath("/admin/grupamentos");revalidatePath("/admin/denuncias");
}
export async function removeMember(fd:FormData){
 const me=await requireAdmin();const unitId=uuid(value(fd,"unitId")),profileId=uuid(value(fd,"profileId"));if(!unitId||!profileId)throw new Error("Vínculo inválido.");
 const {error}=await createAdminClient().from("vortex_unit_members").delete().eq("unit_id",unitId).eq("profile_id",profileId);if(error)throw new Error("Não foi possível remover o vínculo.");
 await audit(me.id,"UNIT_MEMBER_REMOVED",unitId,{profile_id:profileId});revalidatePath("/admin/grupamentos");revalidatePath("/admin/denuncias");
}
export async function saveCategoryRoute(fd:FormData){
 const me=await requireAdmin();const categoryId=uuid(value(fd,"categoryId")),unitId=uuid(value(fd,"unitId"));if(!categoryId)throw new Error("Categoria inválida.");const admin=createAdminClient();
 if(!unitId){const {error}=await admin.from("vortex_category_routes").delete().eq("category_id",categoryId);if(error)throw new Error("Não foi possível remover a regra.");await audit(me.id,"CATEGORY_ROUTE_REMOVED",categoryId,{});}
 else{const {error}=await admin.from("vortex_category_routes").upsert({category_id:categoryId,unit_id:unitId,active:true,updated_at:new Date().toISOString()},{onConflict:"category_id"});if(error)throw new Error("Não foi possível salvar a regra.");await audit(me.id,"CATEGORY_ROUTE_SAVED",categoryId,{unit_id:unitId});}
 revalidatePath("/admin/grupamentos");
}
