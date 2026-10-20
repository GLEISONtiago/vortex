import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bucket = "vortex-attachments";
const confirmation = "prelaunch-vortex-cleanup-20261020-8f6c2d91";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== confirmation) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) break;

    for (const item of data) {
      if (item.id) paths.push(item.name);
      else {
        const { data: nested, error: nestedError } = await supabase.storage.from(bucket).list(item.name, { limit: 1000 });
        if (nestedError) return NextResponse.json({ error: nestedError.message }, { status: 500 });
        for (const child of nested || []) if (child.id) paths.push(`${item.name}/${child.name}`);
      }
    }
    if (data.length < 100) break;
    offset += data.length;
  }

  if (paths.length) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) return NextResponse.json({ error: error.message, found: paths.length }, { status: 500 });
  }

  const { data: remaining, error: remainingError } = await supabase.storage.from(bucket).list("", { limit: 1000 });
  if (remainingError) return NextResponse.json({ error: remainingError.message }, { status: 500 });

  return NextResponse.json({ removed: paths.length, remainingTopLevel: remaining?.length ?? 0 });
}
