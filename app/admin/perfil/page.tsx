import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { roleLabel } from "../presentation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage(){
 const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();const id=claimsData?.claims?.sub;if(!id)redirect("/login");
 const {data:profile}=await supabase.from("vortex_profiles").select("full_name,phone,functional_title,role,active").eq("id",id).maybeSingle();
 if(!profile?.active)redirect("/login");
 const email=String(claimsData?.claims?.email??"");
 return <div className="max-w-5xl"><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">MINHA CONTA</p><h1 className="mt-2 text-3xl font-bold">Meu perfil</h1><p className="mt-2 text-sm text-slate-600">Gerencie seus dados pessoais e a segurança do seu acesso ao VÓRTEX.</p><ProfileForm email={email} fullName={profile.full_name??""} phone={profile.phone??""} functionalTitle={profile.functional_title??""} role={roleLabel(profile.role)} /></div>;
}
