import { LoginForm } from "./login-form";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
export const metadata = { title: "Acesso da equipe | VÓRTEX" };
export default async function LoginPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData?.claims?.sub) {
    const { data: profile } = await supabase.from("vortex_profiles").select("active").eq("id", claimsData.claims.sub).maybeSingle();
    if (profile?.active) redirect("/admin");
  }
  return <LoginForm />;
}
