begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vortex-attachments',
  'vortex-attachments',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

alter table public.vortex_pending_attachments
  drop constraint if exists vortex_pending_attachments_mime_type_check;

alter table public.vortex_pending_attachments
  add constraint vortex_pending_attachments_mime_type_check
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp'));

alter table public.vortex_pending_attachments
  drop constraint if exists vortex_pending_attachments_image_size_check;

alter table public.vortex_pending_attachments
  add constraint vortex_pending_attachments_image_size_check
  check (size_bytes <= 2097152);

create or replace function public.vortex_reserve_public_attachment_upload(
  p_upload_token text,
  p_original_name text,
  p_mime_type text,
  p_file_size bigint
)
returns table(storage_path text, attachment_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_session public.vortex_upload_sessions%rowtype;
  v_active_count integer;
  v_extension text;
  v_token text;
  v_path text;
  v_expires_at timestamptz;
begin
  if p_upload_token is null
    or length(p_upload_token) <> 64
    or p_original_name is null
    or length(btrim(p_original_name)) not between 1 and 255 then
    raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.';
  end if;

  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_file_size is null
    or p_file_size < 1
    or p_file_size > 2097152 then
    raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.';
  end if;

  select s.*
  into v_session
  from public.vortex_upload_sessions s
  where s.token_hash = encode(extensions.digest(p_upload_token, 'sha256'), 'hex')
    and s.expires_at > now()
    and s.consumed_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.';
  end if;

  update public.vortex_pending_attachments pa
  set status = 'EXPIRED'
  where pa.upload_session_id = v_session.id
    and pa.status = 'PENDING'
    and pa.expires_at <= now();

  select count(*)
  into v_active_count
  from public.vortex_pending_attachments pa
  where pa.upload_session_id = v_session.id
    and (
      pa.status = 'CONFIRMED'
      or (pa.status = 'PENDING' and pa.expires_at > now())
    );

  if v_active_count >= v_session.max_files then
    raise exception using errcode = 'P0001', message = 'Limite de anexos atingido.';
  end if;

  v_extension := case p_mime_type
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    else 'webp'
  end;

  v_path := format(
    'reports/%s/%s.%s',
    v_session.report_id,
    extensions.gen_random_uuid(),
    v_extension
  );
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := least(v_session.expires_at, now() + interval '5 minutes');

  insert into public.vortex_pending_attachments (
    upload_session_id,
    report_id,
    storage_path,
    original_name,
    mime_type,
    size_bytes,
    attachment_token_hash,
    expires_at
  )
  values (
    v_session.id,
    v_session.report_id,
    v_path,
    btrim(p_original_name),
    p_mime_type,
    p_file_size,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expires_at
  );

  update public.vortex_upload_sessions s
  set uploaded_count = v_active_count + 1
  where s.id = v_session.id;

  storage_path := v_path;
  attachment_token := v_token;
  expires_at := v_expires_at;
  return next;
exception
  when others then
    raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.';
end;
$$;

alter function public.vortex_reserve_public_attachment_upload(text, text, text, bigint)
  owner to postgres;

revoke all on function public.vortex_reserve_public_attachment_upload(text, text, text, bigint)
  from public, anon, authenticated;

grant execute on function public.vortex_reserve_public_attachment_upload(text, text, text, bigint)
  to service_role;

commit;
