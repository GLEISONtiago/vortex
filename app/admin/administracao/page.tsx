import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";
import { roleDefinitions, vortexRoles } from "../role-definitions";

export default async function AdministrationPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: profiles }, { data: audit }] = await Promise.all([
    admin.from("vortex_profiles").select("id, role, active"),
    admin.from("vortex_audit_log").select("id, action, entity_type, created_at, metadata").order("created_at", { ascending: false }).limit(12),
  ]);
  const active = (profiles ?? []).filter((profile) => profile.active);

  return <>
    <p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">ADMINISTRAÇÃO</p>
    <h1 className="mt-2 text-3xl font-bold">Administração do sistema</h1>
    <p className="mt-2 text-sm text-slate-600">Visão central das funções, acessos e atividades administrativas do VÓRTEX.</p>

    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {vortexRoles.map((role) => <div key={role} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-semibold text-slate-600">{roleDefinitions[role].label}</p><p className="mt-2 text-3xl font-bold">{active.filter((profile) => profile.role === role).length}</p><p className="mt-1 text-xs text-slate-500">usuário(s) ativo(s)</p></div>)}
    </div>

    <section className="mt-8"><h2 className="text-xl font-bold">Matriz de responsabilidades</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{vortexRoles.map((role) => <article key={role} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex items-center justify-between"><h3 className="font-bold">{roleDefinitions[role].label}</h3><span className="rounded-full bg-[#d8f1ed] px-2.5 py-1 text-xs font-bold text-[#095f58]">{role}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{roleDefinitions[role].summary}</p><ul className="mt-4 grid gap-2 text-sm text-slate-700">{roleDefinitions[role].permissions.map((permission) => <li key={permission} className="flex gap-2"><span className="font-bold text-[#0c766d]">✓</span><span>{permission}</span></li>)}</ul></article>)}</div></section>

    <section className="mt-8"><div><h2 className="text-xl font-bold">Atividade administrativa recente</h2><p className="mt-1 text-sm text-slate-600">Últimos eventos registrados na auditoria do sistema.</p></div><div className="mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">{(audit ?? []).length ? <ul className="divide-y divide-slate-100">{(audit ?? []).map((item) => <li key={item.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{item.action.replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{item.entity_type}</p></div><time className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString("pt-BR")}</time></li>)}</ul> : <p className="p-5 text-sm text-slate-600">Nenhuma atividade administrativa registrada.</p>}</div></section>
  </>;
}
