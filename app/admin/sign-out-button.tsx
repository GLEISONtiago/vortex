"use client";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
export function SignOutButton() { const router = useRouter(); return <button onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-bold text-white">Sair</button>; }
