"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "../../../lib/supabase/client";

export function ProfileForm({email,fullName,phone,functionalTitle,role}:{email:string;fullName:string;phone:string;functionalTitle:string;role:string}){
 const [name,setName]=useState(fullName),[phoneValue,setPhone]=useState(phone),[title,setTitle]=useState(functionalTitle);
 const [profileMessage,setProfileMessage]=useState(""),[profileBusy,setProfileBusy]=useState(false);
 const [currentPassword,setCurrentPassword]=useState(""),[newPassword,setNewPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState("");
 const [passwordMessage,setPasswordMessage]=useState(""),[passwordBusy,setPasswordBusy]=useState(false);

 async function saveProfile(e:FormEvent){
  e.preventDefault();setProfileBusy(true);setProfileMessage("");
  const {error}=await createClient().rpc("vortex_update_own_profile",{p_full_name:name,p_phone:phoneValue||null,p_functional_title:title||null});
  setProfileMessage(error?"Não foi possível salvar seu perfil.":"Perfil atualizado com sucesso.");setProfileBusy(false);
 }
 async function changePassword(e:FormEvent){
  e.preventDefault();setPasswordMessage("");
  if(newPassword.length<10){setPasswordMessage("A nova senha deve ter pelo menos 10 caracteres.");return}
  if(newPassword!==confirmPassword){setPasswordMessage("A confirmação da nova senha não confere.");return}
  if(!currentPassword){setPasswordMessage("Informe sua senha atual.");return}
  setPasswordBusy(true);const supabase=createClient();
  const {error:authError}=await supabase.auth.signInWithPassword({email,password:currentPassword});
  if(authError){setPasswordMessage("A senha atual não confere.");setPasswordBusy(false);return}
  const {error}=await supabase.auth.updateUser({password:newPassword});
  if(error)setPasswordMessage("Não foi possível alterar a senha agora.");
  else{setPasswordMessage("Senha alterada com sucesso.");setCurrentPassword("");setNewPassword("");setConfirmPassword("");}
  setPasswordBusy(false);
 }
 return <div className="mt-7 grid gap-6 xl:grid-cols-2">
  <form onSubmit={saveProfile} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
   <h2 className="text-xl font-bold">Informações pessoais</h2><p className="mt-1 text-sm text-slate-600">Você pode atualizar seus próprios dados. Perfil de acesso e lotação são controlados pela administração.</p>
   <label className="mt-5 block text-sm font-semibold">Nome completo<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
   <label className="mt-4 block text-sm font-semibold">E-mail de acesso<input disabled value={email} className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-normal text-slate-500" /></label>
   <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Telefone<input maxLength={30} value={phoneValue} onChange={e=>setPhone(e.target.value)} placeholder="Opcional" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label><label className="text-sm font-semibold">Cargo/função institucional<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Inspetor" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label></div>
   <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Perfil no VÓRTEX: </span><b>{role}</b></div>
   {profileMessage&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">{profileMessage}</p>}<button disabled={profileBusy} className="mt-5 rounded-lg bg-[#0c766d] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{profileBusy?"Salvando...":"Salvar informações"}</button>
  </form>
  <form onSubmit={changePassword} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
   <h2 className="text-xl font-bold">Segurança da conta</h2><p className="mt-1 text-sm text-slate-600">Para trocar sua senha, confirme primeiro a senha atual.</p>
   <label className="mt-5 block text-sm font-semibold">Senha atual<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
   <label className="mt-4 block text-sm font-semibold">Nova senha<input required minLength={10} type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
   <label className="mt-4 block text-sm font-semibold">Confirmar nova senha<input required minLength={10} type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
   <p className="mt-3 text-xs leading-5 text-slate-500">Use uma senha exclusiva, longa e difícil de adivinhar.</p>
   {passwordMessage&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">{passwordMessage}</p>}<button disabled={passwordBusy} className="mt-5 rounded-lg bg-[#092940] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{passwordBusy?"Alterando...":"Alterar senha"}</button>
  </form>
 </div>
}
