import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const confirmation = "prelaunch-vortex-cleanup-20261020-8f6c2d91";
const paths = [
  "denuncias/2026/VTX-2026-0AA2D5/anexos/2f4784a8-b639-4668-bedc-39f578c2be16.webp",
  "denuncias/2026/VTX-2026-0AA2D5/anexos/6d20fbc2-60f0-430b-9977-ddedc81b32da.webp",
  "denuncias/2026/VTX-2026-0AA2D5/anexos/a210ccc4-f673-45f7-907b-af1e5368791a.webp",
  "denuncias/2026/VTX-2026-0AA2D5/anexos/e5c72118-3fde-424c-99ca-33c92b651424.webp",
  "denuncias/2026/VTX-2026-196530/anexos/399f8d1f-a878-4da6-9dff-0f9af7af8b4d.webp",
  "denuncias/2026/VTX-2026-96E2DC/anexos/2e2e039e-c35b-4c92-9b9f-4e7887b50813.webp",
  "denuncias/2026/VTX-2026-96E2DC/anexos/5596e1c9-0786-46b8-9f0b-c9d588b725b9.webp",
  "denuncias/2026/VTX-2026-96E2DC/anexos/6ba335e4-c329-4a95-ab24-57ab3f997288.webp",
  "denuncias/2026/VTX-2026-96E2DC/anexos/8ff5aab1-ee71-4ada-9179-81f4b7293a59.webp",
  "denuncias/2026/VTX-2026-96E2DC/anexos/9042bde1-b207-4c52-9cd0-cbf28c63dfe8.webp",
  "denuncias/2026/VTX-2026-9D4511/anexos/36ff46cf-52f9-40f5-91a0-f23eb9d0dbc5.webp",
  "denuncias/2026/VTX-2026-9D4511/anexos/3b212828-a14d-42fa-971f-b1a2c80e42c4.webp",
  "denuncias/2026/VTX-2026-9D4511/anexos/98e087b2-5722-4381-b510-73152ddc934a.webp",
  "denuncias/2026/VTX-2026-9D4511/anexos/baa3ad69-65de-4425-b06a-1eba73fe24d4.webp",
  "denuncias/2026/VTX-2026-9D4511/anexos/ecd16863-a84b-4e60-bb99-f5d8dfec49a5.webp"
];
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== confirmation) return NextResponse.json({ error: "not found" }, { status: 404 });
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from("vortex-attachments").remove(paths);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removedRequested: paths.length });
}
