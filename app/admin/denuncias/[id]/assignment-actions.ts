"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "../../../../lib/supabase/server";

function refresh(reportId:string){
  revalidatePath("/admin");revalidatePath("/admin/triagem");revalidatePath("/admin/denuncias");revalidatePath(`/admin/denuncias/${reportId}`);
}

export async function assignReport(reportId:string,assignedTo:string){
  const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;
  if(!userId)return{error:"Sua sessão expirou."};
  const {data:manager}=await supabase.from("vortex_profiles").select("role,active").eq("id",userId).maybeSingle();
  if(!manager?.active||manager.role!=="COORDENADOR")return{error:"Somente a chefia/coordenação responsável pode atribuir a denúncia a um agente, operador ou inspetor."};
  const {data,error}=await supabase.rpc("vortex_assign_report",{p_report_id:reportId,p_assigned_to:assignedTo});
  if(error)return{error:"Não foi possível concluir a atribuição."};
  refresh(reportId);return{message:data==="UNCHANGED"?"Esta pessoa já é a responsável atual.":"Responsável atribuído com sucesso."};
}

export async function routeReport(reportId:string,unitId:string){
  const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;
  if(!userId)return{error:"Sua sessão expirou."};
  const {data:manager}=await supabase.from("vortex_profiles").select("role,active").eq("id",userId).maybeSingle();
  if(!manager?.active||!["ADMIN","DIRETORIA"].includes(manager.role))return{error:"Somente a Administração ou a Diretoria Operacional pode realizar a triagem."};
  const {error}=await supabase.rpc("vortex_route_report",{p_report_id:reportId,p_unit_id:unitId});
  if(error)return{error:"Não foi possível encaminhar a denúncia ao grupamento selecionado."};
  refresh(reportId);return{message:"Denúncia encaminhada à chefia/coordenação do grupamento selecionado."};
}

export async function returnToDirectorate(reportId:string,reason:string){
  const clean=reason.trim();
  if(clean.length<5)return{error:"Informe o motivo da devolução para a Diretoria Operacional."};
  const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub;
  if(!userId)return{error:"Sua sessão expirou."};
  const {data:manager}=await supabase.from("vortex_profiles").select("role,active").eq("id",userId).maybeSingle();
  if(!manager?.active||manager.role!=="COORDENADOR")return{error:"Somente a chefia/coordenação responsável pode devolver a denúncia para nova triagem."};
  const {error}=await supabase.rpc("vortex_return_report_to_directorate",{p_report_id:reportId,p_reason:clean});
  if(error)return{error:"Não foi possível devolver a denúncia para a Diretoria Operacional."};
  refresh(reportId);return{message:"Denúncia devolvida para a fila de triagem da Diretoria Operacional."};
}
