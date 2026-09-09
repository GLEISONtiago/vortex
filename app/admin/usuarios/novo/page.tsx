import { requireAdmin } from "../../../../lib/auth/require-admin";
import { UserForm } from "../user-form";

export default async function NewUserPage() { await requireAdmin(); return <><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">ADMINISTRAÇÃO</p><h1 className="mt-2 text-3xl font-bold">Novo usuário</h1><p className="mt-2 text-sm text-slate-600">Crie um acesso operacional com senha temporária.</p><div className="mt-7 max-w-3xl"><UserForm /></div></>; }
