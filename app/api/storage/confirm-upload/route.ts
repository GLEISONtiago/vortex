import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const runtime = "nodejs";

const attachmentBucket = "vortex-attachments";

export async function POST(request: Request) {
  let body: { uploadToken?: unknown; attachmentToken?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  }

  if (
    typeof body.uploadToken !== "string"
    || typeof body.attachmentToken !== "string"
  ) {
    return NextResponse.json({ error: "Anexo inválido." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("vortex_get_pending_public_attachment", {
      p_upload_token: body.uploadToken,
      p_attachment_token: body.attachmentToken,
    });

    const pending = data?.[0] as {
      storage_path?: string;
      mime_type?: string;
      size_bytes?: number;
    } | undefined;

    if (
      error
      || !pending?.storage_path
      || !pending.mime_type
      || !pending.size_bytes
    ) {
      return NextResponse.json(
        { error: "Não foi possível confirmar o anexo." },
        { status: 403 },
      );
    }

    const { data: object, error: objectError } = await supabase.storage
      .from(attachmentBucket)
      .info(pending.storage_path);

    if (
      objectError
      || !object
      || object.size !== pending.size_bytes
      || object.contentType !== pending.mime_type
    ) {
      return NextResponse.json(
        { error: "O arquivo enviado não corresponde ao anexo autorizado." },
        { status: 400 },
      );
    }

    const { data: confirmed, error: confirmError } = await supabase.rpc(
      "vortex_confirm_public_attachment_upload",
      {
        p_upload_token: body.uploadToken,
        p_attachment_token: body.attachmentToken,
        p_content_length: object.size,
        p_content_type: object.contentType,
      },
    );

    if (confirmError || !confirmed) {
      return NextResponse.json(
        { error: "Não foi possível confirmar o anexo." },
        { status: 409 },
      );
    }

    return NextResponse.json({ confirmed: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível verificar o arquivo enviado." },
      { status: 503 },
    );
  }
}
