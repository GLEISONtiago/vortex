begin;

create table if not exists public.vortex_system_settings (
  id boolean primary key default true check (id),
  storage_quota_bytes bigint not null default 1073741824 check (storage_quota_bytes > 0),
  storage_warning_percent integer not null default 80 check (storage_warning_percent between 1 and 99),
  storage_critical_percent integer not null default 95 check (storage_critical_percent between 2 and 100),
  updated_at timestamptz not null default now(),
  check (storage_warning_percent < storage_critical_percent)
);

insert into public.vortex_system_settings (
  id,
  storage_quota_bytes,
  storage_warning_percent,
  storage_critical_percent
)
values (true, 1073741824, 80, 95)
on conflict (id) do nothing;

alter table public.vortex_system_settings enable row level security;

alter table public.vortex_attachments
  add column if not exists backed_up_at timestamptz,
  add column if not exists storage_deleted_at timestamptz;

create index if not exists vortex_attachments_backed_up_idx
  on public.vortex_attachments (backed_up_at)
  where backed_up_at is not null;

create index if not exists vortex_attachments_storage_deleted_idx
  on public.vortex_attachments (storage_deleted_at)
  where storage_deleted_at is null;

create table if not exists public.vortex_backup_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  label text not null check (length(btrim(label)) between 1 and 120),
  period_start date,
  period_end date,
  report_count integer not null default 0 check (report_count >= 0),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.vortex_report_backups (
  batch_id uuid not null references public.vortex_backup_batches(id) on delete cascade,
  report_id uuid not null references public.vortex_reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (batch_id, report_id)
);

create index if not exists vortex_report_backups_report_idx
  on public.vortex_report_backups (report_id, created_at desc);

alter table public.vortex_backup_batches enable row level security;
alter table public.vortex_report_backups enable row level security;

create or replace function public.vortex_get_storage_usage()
returns table(
  used_bytes bigint,
  object_count bigint,
  quota_bytes bigint,
  remaining_bytes bigint,
  usage_percent numeric,
  warning_level text
)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  with settings as (
    select
      s.storage_quota_bytes,
      s.storage_warning_percent,
      s.storage_critical_percent
    from public.vortex_system_settings s
    where s.id = true
  ),
  usage as (
    select
      coalesce(sum(
        case
          when (o.metadata ->> 'size') ~ '^[0-9]+$'
            then (o.metadata ->> 'size')::bigint
          else 0
        end
      ), 0)::bigint as bytes,
      count(*)::bigint as objects
    from storage.objects o
    where o.bucket_id = 'vortex-attachments'
      and o.is_delete_marker = false
      and o.archived_at is null
  )
  select
    u.bytes,
    u.objects,
    s.storage_quota_bytes,
    greatest(s.storage_quota_bytes - u.bytes, 0)::bigint,
    round((u.bytes::numeric / s.storage_quota_bytes::numeric) * 100, 2),
    case
      when u.bytes::numeric / s.storage_quota_bytes::numeric * 100 >= s.storage_critical_percent then 'CRITICAL'
      when u.bytes::numeric / s.storage_quota_bytes::numeric * 100 >= s.storage_warning_percent then 'WARNING'
      else 'OK'
    end
  from usage u
  cross join settings s;
$$;

alter function public.vortex_get_storage_usage() owner to postgres;
revoke all on function public.vortex_get_storage_usage() from public, anon, authenticated;
grant execute on function public.vortex_get_storage_usage() to service_role;

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
  v_protocol text;
  v_year text;
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

  select r.protocol, to_char(r.created_at, 'YYYY')
  into v_protocol, v_year
  from public.vortex_reports r
  where r.id = v_session.report_id;

  if v_protocol is null or v_year is null then
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
    'denuncias/%s/%s/anexos/%s.%s',
    v_year,
    v_protocol,
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
