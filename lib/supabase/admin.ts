import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicConfig } from "./public-config";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabasePublicConfig.url;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("A configuração administrativa do Supabase não está disponível.");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
