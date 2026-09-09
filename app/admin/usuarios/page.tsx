import Link from "next/link";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { UserTable, type UserRow } from "./user-table";

const roles = ["ADMIN", "COORDENADOR", "AGENTE", "ANALISTA"];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; active?: string }> }) {
  await requireAdmin(); const params = await searchParams; const supabase = await createClient();
  const [{ data: profiles, error: profileError }, { data: assignments, error: assignmentError }] = await Promise.all([supabase.from("vortex_profiles").select("id, full_name, role, active").order("active", { ascending: false }).order("full_name"), supabase.from("vortex_report_assignments").select("assigned_to").is("ended_at", null)]);
  let authUsers: { id: string; email?: string }[] = [];
  let authError = false;
  try { const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 }); authUsers = data.users; authError = Boolean(error); } catch { authError = true; }
  const emails = new Map(authUsers.map((user) => [user.id, user.email || ""])); const counts = new Map<string, number>(); (assignments ?? []).forEach((item) => counts.set(item.assigned_to, (counts.get(item.assigned_to) || 0) + 1));
  const q = params.q?.trim().toLocaleLowerCase("pt-BR") || "";
  const users: UserRow[] = (profiles ?? []).map((profile) => ({ id: profile.id, fullName: profile.full_name, email: emails.get(profile.id) || "", role: profile.role, active: profile.active, assignments: counts.get(profile.id) || 0 })).filter((user) => (!q || `${user.fullName || ""} ${user.email}`.toLocaleLowerCase("pt-BR").includes(q)) && (!params.role || user.role === params.role) && (!params.active || String(user.active) === params.active));
  const error = profileError || assignmentError || authError;
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">ADMINISTRAÇÃO</p><h1 className="mt-2 text-3xl font-bold">Usuários</h1><p className="mt-2 text-sm text-slate-600">Gerencie os acessos operacionais do VÓRTEX.</p></div><Link href="/admin/usuarios/novo" className="min-h-11 rounded-lg bg-[#0c766d] px-5 py-3 text-sm font-bold text-white">Novo usuário</Link></div><form className="mt-7 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-4"><input name="q" defaultValue={params.q} placeholder="Buscar nome ou e-mail" className="rounded-lg border border-slate-300 px-3 py-3 text-sm sm:col-span-2" /><select name="role" defaultValue={params.role} className="rounded-lg border border-slate-300 px-3 py-3 text-sm"><option value="">Todos os perfis</option>{roles.map((role) => <option key={role} value={role}>{role === "ADMIN" ? "Administrador" : role[0] + role.slice(1).toLowerCase()}</option>)}</select><select name="active" defaultValue={params.active} className="rounded-lg border border-slate-300 px-3 py-3 text-sm"><option value="">Todos os status</option><option value="true">Ativos</option><option value="false">Inativos</option></select><button className="rounded-lg bg-[#092940] px-4 py-3 text-sm font-bold text-white sm:col-span-4">Aplicar filtros</button></form>{error ? <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">Não foi possível carregar todos os usuários. Verifique a configuração administrativa e tente novamente.</p> : <UserTable users={users} />}</>;
}
