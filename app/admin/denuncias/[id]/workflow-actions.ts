"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";

const allowedStatuses = ["NOVA","EM_ANALISE","EM_ATENDIMENTO","FINALIZADA"];
const allowedResolutions = ["PROCEDENTE","IMPROCEDENTE","RESOLVIDA","ENCAMINHADA_OUTRO_ORGAO","NAO_FOI_POSSIVEL_AVERIGUAR"];

async function context(reportId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { supabase, error: "Sua sessão expirou." };
  const [{ data: me }, { data: report }] = await Promise.all([
    supabase.from("vortex_profiles").select("role, active").eq("id", userId).maybeSingle(),
    supabase.from("vortex_reports").select("id, status").eq("id", reportId).maybeSingle(),
  ]);
  if (!me?.active || !report) return { supabase, error: "Acesso indisponível." };
  return { supabase, userId, me, report };
}

export async function updateReportStatus(reportId: string, newStatus: string, note: string, resolution?: string) {
  if (!allowedStatuses.includes(newStatus)) return { error: "Status inválido." };
  if (newStatus === "FINALIZADA" && !allowedResolutions.includes(resolution || "")) return { error: "Selecione o resultado da finalização." };
  const ctx = await context(reportId); if ("error" in ctx) return { error: ctx.error };
  const { supabase, userId, me, report } = ctx;
  const canManage = ["ADMIN","COORDENADOR"].includes(me!.role);
  if (!canManage) {
    const { data: assignment } = await supabase.from("vortex_report_assignments").select("id").eq("report_id", reportId).eq("assigned_to", userId!).is("ended_at", null).maybeSingle();
    if (!assignment) return { error: "Somente o responsável atual pode atualizar esta denúncia." };
  }
  if (report!.status === newStatus) return { message: "A denúncia já está neste status." };
  const { error } = await supabase.rpc("vortex_update_report_status", { p_report_id: reportId, p_new_status: newStatus, p_resolution: newStatus === "FINALIZADA" ? resolution : null, p_note: note.trim() || null });
  if (error) return { error: "Não foi possível atualizar o status." };
  revalidatePath("/admin"); revalidatePath("/admin/denuncias"); revalidatePath(`/admin/denuncias/${reportId}`);
  return { message: "Status atualizado com sucesso." };
}

export async function addInternalNote(reportId: string, note: string) {
  const clean = note.trim(); if (clean.length < 3) return { error: "Informe uma observação válida." };
  const ctx = await context(reportId); if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;
  const { error } = await supabase.rpc("vortex_add_internal_note", { p_report_id: reportId, p_note: clean });
  if (error) return { error: "Não foi possível registrar a observação." };
  revalidatePath(`/admin/denuncias/${reportId}`); return { message: "Observação registrada no histórico." };
}

export async function sendReporterMessage(reportId: string, message: string, waitForReply = false) {
  const clean = message.trim(); if (clean.length < 2) return { error: "Digite uma mensagem." };
  const ctx = await context(reportId); if ("error" in ctx) return { error: ctx.error };
  const { supabase } = ctx;
  const { error } = await supabase.rpc("vortex_send_staff_message", { p_report_id: reportId, p_message: clean });
  if (error) return { error: "Não foi possível enviar a mensagem." };
  if (waitForReply) {
    const { error: waitingError } = await supabase.rpc("vortex_set_awaiting_reporter_info", { p_report_id: reportId, p_waiting: true });
    if (waitingError) return { error: "A mensagem foi enviada, mas não foi possível marcar a denúncia como aguardando complemento." };
  }
  revalidatePath("/admin"); revalidatePath("/admin/denuncias"); revalidatePath(`/admin/denuncias/${reportId}`);
  return { message: waitForReply ? "Mensagem enviada. A denúncia está aguardando complemento do denunciante." : "Mensagem disponibilizada no acompanhamento da denúncia." };
}

export async function finalizeReport(reportId:string,resolution:string,summary:string,message:string,forwardedAgency?:string){
  if(!allowedResolutions.includes(resolution)) return {error:"Selecione um resultado válido."};
  const cleanSummary=summary.trim(),cleanMessage=message.trim(),agency=(forwardedAgency||"").trim();
  if(cleanSummary.length<10) return {error:"Informe um resumo do atendimento com pelo menos 10 caracteres."};
  if(cleanMessage.length<2) return {error:"Informe a mensagem final ao denunciante."};
  if(resolution==="ENCAMINHADA_OUTRO_ORGAO"&&!agency) return {error:"Informe o órgão de destino."};
  const ctx=await context(reportId); if("error" in ctx)return{error:ctx.error};
  const {supabase}=ctx;
  const {error}=await supabase.rpc("vortex_finalize_report",{p_report_id:reportId,p_resolution:resolution,p_summary:cleanSummary,p_message:cleanMessage,p_forwarded_agency:agency||null});
  if(error)return{error:"Não foi possível finalizar a denúncia."};
  revalidatePath("/admin");revalidatePath("/admin/denuncias");revalidatePath(`/admin/denuncias/${reportId}`);
  return{message:"Denúncia finalizada e retorno enviado ao denunciante."};
}
