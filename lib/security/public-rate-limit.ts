import { createHash } from "node:crypto";
import { createAdminClient } from "../supabase/admin";

export async function consumePublicRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  const digest = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const rateKey = `${scope}:${digest}`;

  try {
    const { data, error } = await createAdminClient().rpc("vortex_consume_public_rate_limit", {
      p_rate_key: rateKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return null;
    return data === true;
  } catch {
    return null;
  }
}
