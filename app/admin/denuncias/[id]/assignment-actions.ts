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

  const { data, error } = await supabase.rpc("vortex_assign_report", { p_report_id: reportId, p_assigned_to: assignedTo });
  if (error) return { error: "Não foi possível concluir a atribuição." };
  revalidatePath("/admin");
  revalidatePath("/admin/denuncias");
  revalidatePath(`/admin/denuncias/${reportId}`);
  return { message: data === "UNCHANGED" ? "Esta pessoa já é a responsável atual." : "Responsável atribuído com sucesso." };
}
