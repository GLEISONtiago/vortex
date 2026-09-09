"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";

const roles = ["ADMIN", "COORDENADOR", "AGENTE", "ANALISTA"] as const;
type Role = (typeof roles)[number];
type ActionResult = { error?: string; success?: string };

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function roleValue(formData: FormData): Role | null { const role = value(formData, "role") as Role; return roles.includes(role) ? role : null; }
async function audit(actorId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
  try { await createAdminClient().from("vortex_audit_log").insert({ actor_id: actorId, action, entity_type: "USER", entity_id: entityId, metadata }); } catch { /* A operação principal não deve ser revertida por uma falha de auditoria. */ }
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const fullName = value(formData, "fullName"); const email = value(formData, "email").toLowerCase(); const password = value(formData, "password"); const role = roleValue(formData); const active = formData.get("active") === "on";
  if (!fullName || fullName.length > 150) return { error: "Informe um nome completo válido." };
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha temporária deve ter pelo menos 8 caracteres." };
  if (!role) return { error: "Selecione um perfil válido." };

  let supabase; try { supabase = createAdminClient(); } catch { return { error: "A configuração administrativa não está disponível." }; }
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !authData.user) return { error: "Não foi possível criar o acesso. Verifique os dados e tente novamente." };
  const { error: profileError } = await supabase.from("vortex_profiles").upsert({ id: authData.user.id, full_name: fullName, role, active });
  if (profileError) { await supabase.auth.admin.deleteUser(authData.user.id); return { error: "Não foi possível concluir o cadastro do perfil." }; }
  await audit(admin.id, "USER_CREATED", authData.user.id, { role, active });
  revalidatePath("/admin/usuarios");
  return { success: "Usuário criado com sucesso." };
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = value(formData, "id"); const fullName = value(formData, "fullName"); const role = roleValue(formData); const active = formData.get("active") === "on";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !fullName || fullName.length > 150 || !role) return { error: "Dados de usuário inválidos." };
  if (id === admin.id && (!active || role !== "ADMIN")) return { error: "Não é possível remover ou alterar seu próprio acesso administrativo." };
  let supabase; try { supabase = createAdminClient(); } catch { return { error: "A configuração administrativa não está disponível." }; }
  const { error } = await supabase.from("vortex_profiles").update({ full_name: fullName, role, active }).eq("id", id);
  if (error) return { error: "Não foi possível atualizar o usuário." };
  const action = active ? "USER_UPDATED" : "USER_DEACTIVATED";
  await audit(admin.id, action, id, { role, active });
  revalidatePath("/admin/usuarios"); revalidatePath(`/admin/usuarios/${id}`);
  return { success: "Usuário atualizado com sucesso." };
}

export async function toggleUserActive(id: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Usuário inválido." };
  if (id === admin.id && !active) return { error: "Não é possível desativar seu próprio acesso." };
  let supabase; try { supabase = createAdminClient(); } catch { return { error: "A configuração administrativa não está disponível." }; }
  const { error } = await supabase.from("vortex_profiles").update({ active }).eq("id", id);
  if (error) return { error: "Não foi possível alterar o status do usuário." };
  await audit(admin.id, active ? "USER_ACTIVATED" : "USER_DEACTIVATED", id, { active });
  revalidatePath("/admin/usuarios"); revalidatePath(`/admin/usuarios/${id}`);
  return { success: active ? "Usuário ativado." : "Usuário desativado." };
}
