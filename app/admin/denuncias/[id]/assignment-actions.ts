"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";

export async function assignReport(reportId: string, assignedTo: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { error: "Sua sessão expirou." };
  const { data: manager } = await supabase.from("vortex_profiles").select("role, active").eq("id", userId).maybeSingle();
  if (!manager?.active || !["ADMIN", "COORDENADOR"].includes(manager.role)) return { error: "Você não tem permissão para atribuir denúncias." };
  const { data: current, error: currentError } = await supabase.from("vortex_report_assignments").select("id, assigned_to").eq("report_id", reportId).is("ended_at", null).maybeSingle();
  if (currentError) return { error: "Não foi possível consultar a atribuição atual." };
  if (current?.assigned_to === assignedTo) return { message: "Esta pessoa já é a responsável atual." };
  if (current) { const { error } = await supabase.from("vortex_report_assignments").update({ ended_at: new Date().toISOString() }).eq("id", current.id); if (error) return { error: "Não foi possível encerrar a atribuição anterior." }; }
  const { error } = await supabase.from("vortex_report_assignments").insert({ report_id: reportId, assigned_to: assignedTo, assigned_by: userId });
  if (error) return { error: "Não foi possível concluir a atribuição." };
  revalidatePath(`/admin/denuncias/${reportId}`); return { message: "Responsável atribuído com sucesso." };
}
