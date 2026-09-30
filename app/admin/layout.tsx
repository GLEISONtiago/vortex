import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { BrandMark } from "../components/brand-mark";
import { roleLabel } from "./presentation";
import { SignOutButton } from "./sign-out-button";

const navClass="group flex min-h-11 items-center justify-between gap-3 border-l-2 border-transparent px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-[#4fc6b5] hover:bg-white/10 hover:text-white";

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
      if (usage) storageAlert={usagePercent:Number(usage.usage_percent??0),warningLevel:String(usage.warning_level??"OK")};
    } catch { storageAlert = null; }
  }

  return <div className="min-h-screen bg-[#eef2f3] text-[#102b42]">
    <header className="border-b-4 border-[#0c766d] bg-[#071e31] text-white shadow-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark />
          <div className="hidden border-l border-white/15 pl-4 lg:block">
            <p className="text-[10px] font-black tracking-[.18em] text-[#74d5c9]">GUARDA CIVIL MUNICIPAL DE JOÃO PESSOA</p>
            <p className="mt-1 text-xs font-semibold tracking-wide text-slate-300">CENTRAL OPERACIONAL · GESTÃO DE DENÚNCIAS</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block"><p className="max-w-52 truncate text-sm font-bold text-white">{profile.full_name||"Equipe GCMJP"}</p><p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#74d5c9]">{roleLabel(profile.role)}</p></div>
          <Link href="/admin/perfil" className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10">Meu perfil</Link>
          <SignOutButton />
        </div>
      </div>
    </header>

    <div className="mx-auto w-full max-w-[1600px] md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="bg-[#0b2a43] text-white md:min-h-[calc(100vh-69px)]">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[10px] font-black tracking-[.18em] text-[#74d5c9]">VÓRTEX OPERACIONAL</p>
          <p className="mt-2 text-sm leading-5 text-slate-300">Ambiente interno de triagem, despacho e acompanhamento.</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-3">
          <Link className={navClass} href="/admin"><span>Painel operacional</span></Link>
          <Link className={navClass} href="/admin/denuncias"><span>Denúncias</span></Link>
          {profile.role==="DIRETORIA"&&<Link className={navClass} href="/admin/triagem"><span>Triagem geral</span></Link>}
          <Link className={navClass} href="/admin/notificacoes"><span>Notificações</span>{(unreadNotifications??0)>0&&<span className="grid min-w-6 place-items-center rounded-full bg-[#e7b548] px-1.5 py-0.5 text-[10px] font-black text-[#102b42]">{unreadNotifications}</span>}</Link>
          {profile.role==="ADMIN"&&<>
            <div className="mx-3 my-2 hidden border-t border-white/10 md:block"/>
            <p className="hidden px-4 pb-1 pt-2 text-[10px] font-black tracking-[.15em] text-slate-400 md:block">ADMINISTRAÇÃO</p>
            <Link className={navClass} href="/admin/publicacoes"><span>Publicações</span></Link>
            <Link className={navClass} href="/admin/grupamentos"><span>Grupamentos</span></Link>
            <Link className={navClass} href="/admin/usuarios"><span>Usuários</span></Link>
            <Link className={navClass} href="/admin/administracao"><span>Administração</span></Link>
            <Link className={navClass} href="/admin/auditoria"><span>Auditoria</span></Link>
            <Link className={navClass} href="/admin/backup"><span>Backup e armazenamento</span></Link>
          </>}
        </nav>
        <div className="hidden px-5 py-5 text-[11px] leading-5 text-slate-400 md:block"><span className="block font-bold text-slate-300">GCMJP · VÓRTEX</span>Uso institucional e operacional.</div>
      </aside>

      <main className="min-w-0 overflow-hidden p-4 sm:p-6 lg:p-8 xl:p-10">
        {storageAlert&&storageAlert.warningLevel!=="OK"&&<Link href="/admin/backup" className={`mb-6 block border-l-4 p-4 text-sm font-semibold shadow-sm ${storageAlert.warningLevel==="CRITICAL"?"border-red-600 bg-red-50 text-red-900":"border-amber-500 bg-amber-50 text-amber-900"}`}>Armazenamento em {storageAlert.usagePercent.toFixed(1)}%. Faça um backup e revise o espaço disponível.</Link>}
        {children}
      </main>
    </div>
  </div>;
}
