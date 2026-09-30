import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { BrandMark } from "../components/brand-mark";
import { roleLabel } from "./presentation";
import { SignOutButton } from "./sign-out-button";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("vortex_profiles").select("full_name, role, active").eq("id", userId).maybeSingle();
  if (!profile?.active) redirect("/login");

  const { count: unreadNotifications } = await supabase.from("vortex_notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null);

  let storageAlert: { usagePercent: number; warningLevel: string } | null = null;
  if (profile.role === "ADMIN") {
    try {
      const admin = createAdminClient();
      const { data } = await admin.rpc("vortex_get_storage_usage");
      const usage = data?.[0];
      if (usage) {
        storageAlert = {
          usagePercent: Number(usage.usage_percent ?? 0),
          warningLevel: String(usage.warning_level ?? "OK"),
        };
      }
    } catch {
      storageAlert = null;
    }
  }

  return <div className="min-h-screen bg-[#f4f7f8] text-[#102b42]">
    <header className="bg-[#092940]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><BrandMark /><div className="flex items-center gap-4 text-right text-xs text-slate-300"><span className="hidden sm:block">{profile.full_name || "Equipe GCMJP"}<br /><b>{roleLabel(profile.role)}</b></span><SignOutButton /></div></div></header>
    <div className="mx-auto w-full max-w-[1600px] md:grid md:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)]">
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-3 md:min-h-[calc(100vh-72px)] md:flex-col md:overflow-visible md:border-b-0 md:border-r">
        <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin">Dashboard</Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/denuncias">Denúncias</Link><Link className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/notificacoes"><span>Notificações</span>{(unreadNotifications ?? 0) > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#0c766d] px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadNotifications}</span>}</Link>
        {profile.role === "ADMIN" && <><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/publicacoes">Publicações</Link><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/usuarios">Usuários</Link><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/administracao">Administração</Link><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/auditoria">Auditoria</Link><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/backup">Backup e armazenamento</Link></>}
      </nav>
      <main className="min-w-0 overflow-hidden p-4 sm:p-6 lg:p-8 xl:p-10">{storageAlert && storageAlert.warningLevel !== "OK" && <Link href="/admin/backup" className={`mb-6 block rounded-xl border p-4 text-sm font-semibold ${storageAlert.warningLevel === "CRITICAL" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>Armazenamento em {storageAlert.usagePercent.toFixed(1)}%. Faça um backup e revise o espaço disponível.</Link>}{children}</main>
    </div>
  </div>;
}
