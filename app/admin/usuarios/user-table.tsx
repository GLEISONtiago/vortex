"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { roleLabel } from "../presentation";
import { toggleUserActive } from "./actions";

export type UserRow = { id: string; fullName: string | null; email: string; role: string; active: boolean; assignments: number };

export function UserTable({ users }: { users: UserRow[] }) {
  const [pending, startTransition] = useTransition(); const [message, setMessage] = useState("");
  const toggle = (user: UserRow) => { const verb = user.active ? "desativar" : "ativar"; if (!window.confirm(`Deseja ${verb} ${user.fullName || user.email}?`)) return; startTransition(async () => { const result = await toggleUserActive(user.id, !user.active); setMessage(result.error || result.success || ""); }); };
  if (!users.length) return <div className="mt-6 rounded-xl bg-white p-8 text-center text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">Nenhum usuário corresponde aos filtros informados.</div>;
  return <><div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Atribuídas</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="p-4 font-semibold">{user.fullName || "Sem nome"}</td><td>{user.email || "—"}</td><td><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{roleLabel(user.role)}</span></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.active ? "bg-[#d8f1ed] text-[#095f58]" : "bg-slate-200 text-slate-600"}`}>{user.active ? "Ativo" : "Inativo"}</span></td><td>{user.assignments}</td><td><div className="flex gap-2"><Link className="rounded-lg border border-[#0c766d] px-3 py-2 text-xs font-bold text-[#0c766d]" href={`/admin/usuarios/${user.id}`}>Editar</Link><button onClick={() => toggle(user)} disabled={pending} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-50">{user.active ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table></div>{message && <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}</>;
}
