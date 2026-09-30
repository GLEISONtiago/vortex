"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

async function currentUser(){
  const s=await createClient();
  const {data}=await s.auth.getClaims();
  return {s,uid:data?.claims?.sub||null};
}

export async function markNotificationRead(id:string){
  const {s,uid}=await currentUser();
  if(!uid)return;
  await s.from("vortex_notifications")
    .update({read_at:new Date().toISOString(),status:"READ"})
    .eq("id",id)
    .eq("recipient_id",uid);
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin");
}

export async function markAllNotificationsRead(){
  const {s,uid}=await currentUser();
  if(!uid)return;
  await s.from("vortex_notifications")
    .update({read_at:new Date().toISOString(),status:"READ"})
    .eq("recipient_id",uid)
    .is("read_at",null);
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin");
}

export async function openNotification(id:string,reportId:string){
  const {s,uid}=await currentUser();
  if(!uid)redirect("/login");
  await s.from("vortex_notifications")
    .update({read_at:new Date().toISOString(),status:"READ"})
    .eq("id",id)
    .eq("recipient_id",uid);
  revalidatePath("/admin/notificacoes");
  revalidatePath("/admin");
  redirect(`/admin/denuncias/${reportId}`);
}
