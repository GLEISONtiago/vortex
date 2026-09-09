"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser } from "./actions";

const roles = [{ value: "ADMIN", label: "Administrador" }, { value: "COORDENADOR", label: "Coordenador" }, { value: "AGENTE", label: "Agente" }, { value: "ANALISTA", label: "Analista" }];
type User = { id: string; full_name: string | null; email: string; role: string; active: boolean };
const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0c766d] focus:ring-2 focus:ring-[#0c766d]/15";

export function UserForm({ user }: { user?: User }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const submit = (formData: FormData) => startTransition(async () => { setMessage(""); setError(""); const result = user ? await updateUser(formData) : await createUser(formData); if (result.error) { setError(result.error); return; } setMessage(result.success || "Alteração salva."); if (!user) router.replace("/admin/usuarios"); else router.refresh(); });
  return <form action={submit} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
    {user && <input type="hidden" name="id" value={user.id} />}
    <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Nome completo *<input name="fullName" required maxLength={150} defaultValue={user?.full_name || ""} className={fieldClass} /></label>
      <label className="text-sm font-semibold text-slate-700">E-mail *<input name="email" required type="email" maxLength={320} defaultValue={user?.email || ""} readOnly={Boolean(user)} className={`${fieldClass} ${user ? "bg-slate-100 text-slate-500" : ""}`} />{user && <span className="mt-1 block text-xs font-normal text-slate-500">A alteração de e-mail não está disponível nesta etapa.</span>}</label>
      <label className="text-sm font-semibold text-slate-700">Perfil *<select name="role" required defaultValue={user?.role || ""} className={fieldClass}><option value="">Selecione</option>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
      {!user && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Senha temporária *<input name="password" required type="password" minLength={8} autoComplete="new-password" className={fieldClass} /><span className="mt-1 block text-xs font-normal text-slate-500">Mínimo de 8 caracteres. Oriente a pessoa a alterar a senha quando esse fluxo estiver disponível.</span></label>}
    </div>
    <label className="mt-6 flex items-center gap-3 text-sm font-semibold"><input name="active" type="checkbox" defaultChecked={user?.active ?? true} className="size-4 accent-[#0c766d]" />Usuário ativo</label>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg bg-[#d8f1ed] p-3 text-sm text-[#095f58]">{message}</p>}
    <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between"><button type="button" onClick={() => router.back()} disabled={pending} className="min-h-11 px-4 text-sm font-bold disabled:opacity-50">Cancelar</button><button disabled={pending} className="min-h-11 rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white disabled:opacity-60">{pending ? "Salvando..." : user ? "Salvar alterações" : "Criar usuário"}</button></div>
  </form>;
}
