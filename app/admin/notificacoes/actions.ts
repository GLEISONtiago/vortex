"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
export async function markNotificationRead(id:string){const s=await createClient();await s.from("vortex_notifications").update({read_at:new Date().toISOString(),status:"READ"}).eq("id",id);revalidatePath("/admin/notificacoes");revalidatePath("/admin");}
export async function markAllNotificationsRead(){const s=await createClient();const {data}=await s.auth.getClaims();const uid=data?.claims?.sub;if(!uid)return;await s.from("vortex_notifications").update({read_at:new Date().toISOString(),status:"READ"}).eq("recipient_id",uid).is("read_at",null);revalidatePath("/admin/notificacoes");revalidatePath("/admin");}
