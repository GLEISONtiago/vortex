import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const confirmation = "vortex-final-test-cleanup-20261020-4e92";
const paths = [
  "denuncias/2026/VTX-2026-3FB35F/anexos/412fa06c-8625-4043-9e9b-79a782cf58f2.png",
  "denuncias/2026/VTX-2026-3FB35F/anexos/d26fbdd3-3755-407b-b878-b438054ab7dc.png"
];
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== confirmation) return NextResponse.json({ error: "not found" }, { status: 404 });
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from("vortex-attachments").remove(paths);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removedRequested: paths.length });
}
