"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
export async function triageReport(formData: FormData) {
 const reportId=String(formData.get("reportId")??"");const unitId=String(formData.get("unitId")??"");
 if(!/^[0-9a-f-]{36}$/i.test(reportId)||!/^[0-9a-f-]{36}$/i.test(unitId)) return;
 const supabase=await createClient();const {error}=await supabase.rpc("vortex_route_report",{p_report_id:reportId,p_unit_id:unitId});
 if(error) throw new Error("Não foi possível concluir a triagem.");
 revalidatePath("/admin/triagem");revalidatePath("/admin");revalidatePath("/admin/denuncias");revalidatePath(`/admin/denuncias/${reportId}`);
}