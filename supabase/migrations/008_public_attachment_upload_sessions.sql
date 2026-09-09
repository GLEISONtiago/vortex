begin;

create table public.vortex_upload_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid not null references public.vortex_reports(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_files integer not null default 5 check (max_files between 1 and 5),
  uploaded_count integer not null default 0 check (uploaded_count between 0 and max_files),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create table public.vortex_pending_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  upload_session_id uuid not null references public.vortex_upload_sessions(id) on delete cascade,
  report_id uuid not null references public.vortex_reports(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime')),
  size_bytes bigint not null check (size_bytes > 0),
  attachment_token_hash text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'EXPIRED')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index vortex_upload_sessions_token_hash_idx on public.vortex_upload_sessions(token_hash);
create index vortex_pending_attachments_session_idx on public.vortex_pending_attachments(upload_session_id, status, expires_at);

alter table public.vortex_upload_sessions enable row level security;
alter table public.vortex_pending_attachments enable row level security;
revoke all on public.vortex_upload_sessions, public.vortex_pending_attachments from public, anon, authenticated;

create function public.vortex_submit_public_report_with_upload(
  p_category_slug text, p_description text, p_urgency text, p_address text, p_neighborhood text,
  p_reference_point text, p_latitude numeric, p_longitude numeric, p_event_at timestamptz, p_tracking_pin text
)
returns table(protocol text, tracking_code text, status public.vortex_report_status, created_at timestamptz, upload_token text, upload_expires_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_protocol text; v_tracking_code text; v_status public.vortex_report_status; v_created_at timestamptz; v_report_id uuid; v_token text; v_expires_at timestamptz;
begin
  select r.protocol, r.tracking_code, r.status, r.created_at into v_protocol, v_tracking_code, v_status, v_created_at
  from public.vortex_submit_public_report(p_category_slug, p_description, p_urgency, p_address, p_neighborhood, p_reference_point, p_latitude, p_longitude, p_event_at, p_tracking_pin) r;
  select id into v_report_id from public.vortex_reports where vortex_reports.protocol = v_protocol;
  if v_report_id is null then raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.'; end if;
  v_token := encode(extensions.gen_random_bytes(32), 'hex'); v_expires_at := now() + interval '15 minutes';
  insert into public.vortex_upload_sessions(report_id, token_hash, expires_at) values (v_report_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at);
  protocol := v_protocol; tracking_code := v_tracking_code; status := v_status; created_at := v_created_at; upload_token := v_token; upload_expires_at := v_expires_at; return next;
exception when others then raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.';
end; $$;

create function public.vortex_reserve_public_attachment_upload(p_upload_token text, p_original_name text, p_mime_type text, p_file_size bigint)
returns table(storage_path text, attachment_token text, expires_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_session public.vortex_upload_sessions%rowtype; v_active_count integer; v_extension text; v_token text; v_path text; v_expires_at timestamptz;
begin
  if p_upload_token is null or length(p_upload_token) <> 64 or p_original_name is null or length(btrim(p_original_name)) not between 1 and 255 then raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.'; end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime') or p_file_size is null or p_file_size < 1 or (p_mime_type like 'image/%' and p_file_size > 10485760) or (p_mime_type like 'video/%' and p_file_size > 52428800) then raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.'; end if;
  select * into v_session from public.vortex_upload_sessions where token_hash = encode(extensions.digest(p_upload_token, 'sha256'), 'hex') and expires_at > now() and consumed_at is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.'; end if;
  update public.vortex_pending_attachments set status = 'EXPIRED' where upload_session_id = v_session.id and status = 'PENDING' and expires_at <= now();
  select count(*) into v_active_count from public.vortex_pending_attachments where upload_session_id = v_session.id and (status = 'CONFIRMED' or (status = 'PENDING' and expires_at > now()));
  if v_active_count >= v_session.max_files then raise exception using errcode = 'P0001', message = 'Limite de anexos atingido.'; end if;
  v_extension := case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' when 'video/webm' then 'webm' else 'mov' end;
  v_path := format('reports/%s/%s.%s', v_session.report_id, extensions.gen_random_uuid(), v_extension); v_token := encode(extensions.gen_random_bytes(32), 'hex'); v_expires_at := least(v_session.expires_at, now() + interval '5 minutes');
  insert into public.vortex_pending_attachments(upload_session_id, report_id, storage_path, original_name, mime_type, size_bytes, attachment_token_hash, expires_at) values (v_session.id, v_session.report_id, v_path, btrim(p_original_name), p_mime_type, p_file_size, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at);
  update public.vortex_upload_sessions set uploaded_count = v_active_count + 1 where id = v_session.id;
  storage_path := v_path; attachment_token := v_token; expires_at := v_expires_at; return next;
exception when others then raise exception using errcode = 'P0001', message = 'Não foi possível autorizar o anexo.';
end; $$;

create function public.vortex_get_pending_public_attachment(p_upload_token text, p_attachment_token text)
returns table(storage_path text, mime_type text, size_bytes bigint)
language sql security definer set search_path = pg_catalog, pg_temp as $$
  select p.storage_path, p.mime_type, p.size_bytes from public.vortex_pending_attachments p join public.vortex_upload_sessions s on s.id = p.upload_session_id
  where s.token_hash = encode(extensions.digest(p_upload_token, 'sha256'), 'hex') and s.expires_at > now() and s.consumed_at is null
    and p.attachment_token_hash = encode(extensions.digest(p_attachment_token, 'sha256'), 'hex') and p.status = 'PENDING' and p.expires_at > now()
$$;

create function public.vortex_confirm_public_attachment_upload(p_upload_token text, p_attachment_token text, p_content_length bigint, p_content_type text)
returns boolean
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_pending public.vortex_pending_attachments%rowtype; v_session public.vortex_upload_sessions%rowtype;
begin
  select s.* into v_session from public.vortex_upload_sessions s where s.token_hash = encode(extensions.digest(p_upload_token, 'sha256'), 'hex') and s.expires_at > now() and s.consumed_at is null for update;
  if not found then raise exception using errcode = 'P0001', message = 'Não foi possível confirmar o anexo.'; end if;
  select * into v_pending from public.vortex_pending_attachments where upload_session_id = v_session.id and attachment_token_hash = encode(extensions.digest(p_attachment_token, 'sha256'), 'hex') and status = 'PENDING' and expires_at > now() for update;
  if not found or v_pending.size_bytes <> p_content_length or v_pending.mime_type <> p_content_type then raise exception using errcode = 'P0001', message = 'Não foi possível confirmar o anexo.'; end if;
  insert into public.vortex_attachments(report_id, storage_path, original_name, mime_type, size_bytes) values (v_pending.report_id, v_pending.storage_path, v_pending.original_name, v_pending.mime_type, v_pending.size_bytes);
  update public.vortex_pending_attachments set status = 'CONFIRMED', confirmed_at = now() where id = v_pending.id;
  return true;
exception when others then raise exception using errcode = 'P0001', message = 'Não foi possível confirmar o anexo.';
end; $$;

alter function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text) owner to postgres;
alter function public.vortex_reserve_public_attachment_upload(text,text,text,bigint) owner to postgres;
alter function public.vortex_get_pending_public_attachment(text,text) owner to postgres;
alter function public.vortex_confirm_public_attachment_upload(text,text,bigint,text) owner to postgres;
revoke all on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text), public.vortex_reserve_public_attachment_upload(text,text,text,bigint), public.vortex_get_pending_public_attachment(text,text), public.vortex_confirm_public_attachment_upload(text,text,bigint,text) from public, anon, authenticated;
grant execute on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text) to anon, authenticated;
grant execute on function public.vortex_reserve_public_attachment_upload(text,text,text,bigint), public.vortex_get_pending_public_attachment(text,text), public.vortex_confirm_public_attachment_upload(text,text,bigint,text) to service_role;
commit;
