import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../lib/auth/require-admin";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { UserForm } from "../user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(); const { id } = await params; const supabase = await createClient(); const { data: profile } = await supabase.from("vortex_profiles").select("id, full_name, role, active").eq("id", id).maybeSingle();
  if (!profile) notFound(); let email = ""; try { const { data } = await createAdminClient().auth.admin.getUserById(id); email = data.user?.email || ""; } catch { notFound(); }
  return <><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">ADMINISTRAÇÃO</p><h1 className="mt-2 text-3xl font-bold">Editar usuário</h1><p className="mt-2 text-sm text-slate-600">Atualize o perfil operacional e o status de acesso.</p><div className="mt-7 max-w-3xl"><UserForm user={{ ...profile, email }} /></div></>;
}
