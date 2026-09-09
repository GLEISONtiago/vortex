import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

export type AdminSession = { id: string; fullName: string | null };

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub;
  if (!id) redirect("/login");
  const { data: profile } = await supabase.from("vortex_profiles").select("full_name, role, active").eq("id", id).maybeSingle();
  if (!profile?.active) redirect("/login");
  if (profile.role !== "ADMIN") redirect("/admin");
  return { id, fullName: profile.full_name };
}
