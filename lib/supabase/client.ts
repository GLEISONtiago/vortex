import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicConfig } from "./public-config";

export function createClient() {
  return createBrowserClient(
    supabasePublicConfig.url,
    supabasePublicConfig.publishableKey,
  );
}
