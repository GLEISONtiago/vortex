import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { roleLabel } from "../presentation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage(){
 const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const id=claimsData?.claims?.sub;if(!id)redirect("/login");
 const [{data:profile},{data:units}]=await Promise.all([
  supabase.from("vortex_profiles").select("full_name,phone,functional_title,role,active").eq("id",id).maybeSingle(),
  supabase.rpc("vortex_my_units"),
 ]);
 if(!profile?.active)redirect("/login");const email=String(claimsData?.claims?.email??"");
 return <div className="max-w-5xl"><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">MINHA CONTA</p><h1 className="mt-2 text-3xl font-bold">Meu perfil</h1><p className="mt-2 text-sm text-slate-600">Gerencie seus dados pessoais e a segurança do seu acesso ao VÓRTEX.</p>
 {(units??[]).length>0&&<section className="mt-6 rounded-xl bg-[#eef9f7] p-4 ring-1 ring-teal-100"><p className="text-xs font-bold uppercase tracking-wide text-[#0c766d]">Lotação operacional</p><div className="mt-2 flex flex-wrap gap-2">{(units??[]).map((unit:{unit_id:string;name:string;member_role:string;can_triage:boolean})=><span key={unit.unit_id} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-teal-100">{unit.name} · {unit.member_role==="COORDENADOR"?"Coordenador":"Inspetor/atendente"}{unit.can_triage?" · Triagem geral":""}</span>)}</div></section>}
 <ProfileForm email={email} fullName={profile.full_name??""} phone={profile.phone??""} functionalTitle={profile.functional_title??""} role={roleLabel(profile.role)}/></div>;
}
