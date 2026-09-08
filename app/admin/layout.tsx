import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { BrandMark } from "../components/brand-mark";
import { SignOutButton } from "./sign-out-button";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");
  const { data: profile } = await supabase.from("vortex_profiles").select("full_name, role, active").eq("id", claimsData.claims.sub).maybeSingle();
  if (!profile?.active) redirect("/login");
  return <div className="min-h-screen bg-[#f4f7f8] text-[#102b42]"><header className="bg-[#092940]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><BrandMark /><div className="flex items-center gap-4 text-right text-xs text-slate-300"><span className="hidden sm:block">{profile.full_name || "Equipe GCMJP"}<br /><b>{profile.role}</b></span><SignOutButton /></div></div></header><div className="mx-auto grid max-w-7xl md:grid-cols-[13rem_1fr]"><nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-3 md:min-h-[calc(100vh-72px)] md:flex-col md:border-b-0 md:border-r"><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin">Dashboard</Link><Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#d8f1ed]" href="/admin/denuncias">Denúncias</Link></nav><main className="min-w-0 p-5 sm:p-8">{children}</main></div></div>;
}
