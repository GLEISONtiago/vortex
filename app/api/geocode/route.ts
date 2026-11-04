import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { consumePublicRateLimit } from "../../../lib/security/public-rate-limit";

export const runtime = "nodejs";

type Point = { latitude: number | null; longitude: number | null };
const searchCache = new Map<string, { point: Point; expires: number }>();
const CACHE_MS = 4 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().replace(/\s+/g, " ") || "";
  if (query.length < 5 || query.length > 300) {
    return NextResponse.json({ error: "Endereço inválido." }, { status: 400 });
  }

  // Only explicit user-initiated address searches reach this route.
  // Repeated addresses are answered locally without another Nominatim request.
  const key = query.toLocaleLowerCase("pt-BR");
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.point, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (cached) searchCache.delete(key);

  const perUser = await consumePublicRateLimit(request, "geocode-lookup", 5, 60);
  if (perUser === null) return NextResponse.json({ error: "Serviço temporariamente indisponível." }, { status: 503 });
  if (!perUser) return NextResponse.json({ error: "Muitas buscas em pouco tempo. Tente novamente mais tarde." }, { status: 429 });

  try {
    // Database-backed global limit covers every Vercel instance. The existing
    // limiter uses a minimum 10-second window; one request in that window
    // stays comfortably below Nominatim's maximum of one request per second.
    const { data: globalAllowed, error: limitError } = await createAdminClient()
      .rpc("vortex_consume_public_rate_limit", {
        p_rate_key: "vortex:nominatim:global",
        p_limit: 1,
        p_window_seconds: 10,
      });
    if (limitError) throw limitError;
    if (!globalAllowed) {
      return NextResponse.json({ error: "A busca de endereços está ocupada. Indique o local no mapa ou aguarde alguns instantes." }, { status: 429 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "br");
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VORTEX-GCMJP/1.1 (+https://vortex.gcmjp.com.br)",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Serviço de mapas indisponível." }, { status: 503 });
    }
    const values = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
    const match = values.find(item => /João Pessoa|Joao Pessoa/i.test(item.display_name));
    const point: Point = match
      ? { latitude: Number(match.lat), longitude: Number(match.lon) }
      : { latitude: null, longitude: null };
    if (searchCache.size > 500) searchCache.clear();
    searchCache.set(key, { point, expires: Date.now() + CACHE_MS });
    return NextResponse.json(point, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Busca de endereços temporariamente indisponível." }, { status: 503 });
  }
}
