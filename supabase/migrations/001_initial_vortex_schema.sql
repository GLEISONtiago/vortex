-- VÓRTEX — schema inicial
-- Esta migration cria apenas recursos próprios do projeto VÓRTEX.

begin;

create extension if not exists pgcrypto with schema extensions;

create type public.vortex_urgency as enum ('LOW', 'MEDIUM', 'HIGH');
create type public.vortex_report_status as enum (
  'NOVA',
  'EM_ANALISE',
  'ENCAMINHADA',
  'EM_ATENDIMENTO',
  'CONCLUIDA',
  'IMPROCEDENTE'
);
create type public.vortex_sender_type as enum ('SYSTEM', 'STAFF', 'REPORTER');
create type public.vortex_staff_role as enum ('ADMIN', 'COORDENADOR', 'AGENTE', 'ANALISTA');

create table public.vortex_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.vortex_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.vortex_staff_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vortex_reports (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  category_id uuid references public.vortex_categories (id),
  description text not null,
  urgency public.vortex_urgency not null,
  status public.vortex_report_status not null default 'NOVA',
  address text,
  neighborhood text,
  reference_point text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  event_at timestamptz,
  tracking_code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vortex_reports_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint vortex_reports_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint vortex_reports_coordinates_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  )
);

create table public.vortex_report_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.vortex_reports (id) on delete cascade,
  old_status public.vortex_report_status,
  new_status public.vortex_report_status not null,
  note text,
  changed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.vortex_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.vortex_reports (id) on delete cascade,
  storage_path text not null,
  original_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint vortex_attachments_size_nonnegative check (size_bytes is null or size_bytes >= 0)
);

create table public.vortex_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.vortex_reports (id) on delete cascade,
  sender_type public.vortex_sender_type not null,
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index vortex_reports_status_idx on public.vortex_reports (status);
create index vortex_reports_category_id_idx on public.vortex_reports (category_id);
create index vortex_reports_created_at_idx on public.vortex_reports (created_at desc);
create index vortex_reports_event_at_idx on public.vortex_reports (event_at desc nulls last);
create index vortex_report_history_report_id_created_at_idx on public.vortex_report_history (report_id, created_at desc);
create index vortex_attachments_report_id_idx on public.vortex_attachments (report_id);
create index vortex_messages_report_id_created_at_idx on public.vortex_messages (report_id, created_at desc);
create index vortex_profiles_role_active_idx on public.vortex_profiles (role) where active;

create function public.vortex_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.vortex_assign_protocol()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  candidate text;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    candidate := format(
      'VTX-%s-%s',
      to_char(current_timestamp, 'YYYY'),
      upper(encode(extensions.gen_random_bytes(3), 'hex'))
    );

    perform pg_advisory_xact_lock(hashtext(candidate));

    exit when not exists (
      select 1 from public.vortex_reports where protocol = candidate
    );

    if attempts >= 10 then
      raise exception 'Não foi possível gerar um protocolo único';
    end if;
  end loop;

  new.protocol = candidate;
  return new;
end;
$$;

create function public.vortex_generate_tracking_code()
returns text
language sql
volatile
security definer
set search_path = pg_catalog, pg_temp
as $$
  select upper(encode(extensions.gen_random_bytes(16), 'hex'));
$$;

create function public.vortex_hash_tracking_code(raw_code text)
returns text
language sql
volatile
strict
security definer
set search_path = pg_catalog, pg_temp
as $$
  select extensions.crypt(raw_code, extensions.gen_salt('bf', 12));
$$;

create function public.vortex_is_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.vortex_profiles
    where id = auth.uid()
      and active = true
  );
$$;

create function public.vortex_verify_tracking_code(raw_code text, stored_hash text)
returns boolean
language sql
stable
strict
security definer
set search_path = pg_catalog, pg_temp
as $$
  select extensions.crypt(raw_code, stored_hash) = stored_hash;
$$;

create function public.vortex_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.vortex_profiles
    where id = auth.uid()
      and active = true
      and role = 'ADMIN'
  );
$$;

create function public.vortex_record_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.vortex_report_history (report_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.vortex_report_history (report_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;

  return new;
end;
$$;

create trigger vortex_reports_set_updated_at
before update on public.vortex_reports
for each row execute function public.vortex_set_updated_at();

create trigger vortex_profiles_set_updated_at
before update on public.vortex_profiles
for each row execute function public.vortex_set_updated_at();

create trigger vortex_reports_assign_protocol
before insert on public.vortex_reports
for each row execute function public.vortex_assign_protocol();

create trigger vortex_reports_record_status_change
after insert or update of status on public.vortex_reports
for each row execute function public.vortex_record_status_change();

alter table public.vortex_categories enable row level security;
alter table public.vortex_profiles enable row level security;
alter table public.vortex_reports enable row level security;
alter table public.vortex_report_history enable row level security;
alter table public.vortex_attachments enable row level security;
alter table public.vortex_messages enable row level security;

revoke all on table public.vortex_categories from anon, authenticated;
revoke all on table public.vortex_profiles from anon, authenticated;
revoke all on table public.vortex_reports from anon, authenticated;
revoke all on table public.vortex_report_history from anon, authenticated;
revoke all on table public.vortex_attachments from anon, authenticated;
revoke all on table public.vortex_messages from anon, authenticated;

grant select on table public.vortex_categories to anon, authenticated;
grant select on table public.vortex_profiles to authenticated;
grant update on table public.vortex_profiles to authenticated;
grant select on table public.vortex_reports to authenticated;
grant select on table public.vortex_report_history to authenticated;
grant select on table public.vortex_attachments to authenticated;
grant select on table public.vortex_messages to authenticated;

create policy "Active Vórtex categories are public"
on public.vortex_categories
for select
to anon, authenticated
using (active = true);

create policy "Active Vórtex staff can view all categories"
on public.vortex_categories
for select
to authenticated
using (public.vortex_is_staff());

create policy "Staff can view their own Vórtex profile"
on public.vortex_profiles
for select
to authenticated
using (id = auth.uid() or public.vortex_is_admin());

create policy "Admins can update Vórtex profiles"
on public.vortex_profiles
for update
to authenticated
using (public.vortex_is_admin())
with check (public.vortex_is_admin());

create policy "Active Vórtex staff can view reports"
on public.vortex_reports
for select
to authenticated
using (public.vortex_is_staff());

create policy "Active Vórtex staff can view report history"
on public.vortex_report_history
for select
to authenticated
using (public.vortex_is_staff());

create policy "Active Vórtex staff can view attachments"
on public.vortex_attachments
for select
to authenticated
using (public.vortex_is_staff());

create policy "Active Vórtex staff can view messages"
on public.vortex_messages
for select
to authenticated
using (public.vortex_is_staff());

revoke execute on function public.vortex_set_updated_at() from public, anon, authenticated;
revoke execute on function public.vortex_assign_protocol() from public, anon, authenticated;
revoke execute on function public.vortex_generate_tracking_code() from public, anon, authenticated;
revoke execute on function public.vortex_hash_tracking_code(text) from public, anon, authenticated;
revoke execute on function public.vortex_verify_tracking_code(text, text) from public, anon, authenticated;
revoke execute on function public.vortex_is_staff() from public, anon;
revoke execute on function public.vortex_is_admin() from public, anon;
revoke execute on function public.vortex_record_status_change() from public, anon, authenticated;
grant execute on function public.vortex_is_staff() to authenticated;
grant execute on function public.vortex_is_admin() to authenticated;

insert into public.vortex_categories (name, slug, description, sort_order)
values
  ('Segurança urbana', 'seguranca-urbana', 'Informações relacionadas à segurança em áreas urbanas.', 10),
  ('Tráfico/comércio de drogas', 'trafico-comercio-de-drogas', 'Informações relacionadas a tráfico ou comércio de drogas.', 20),
  ('Furto/roubo', 'furto-roubo', 'Informações relacionadas a furto ou roubo.', 30),
  ('Violência/agressão', 'violencia-agressao', 'Informações relacionadas a violência ou agressão.', 40),
  ('Vandalismo', 'vandalismo', 'Danos ou depredação de patrimônio.', 50),
  ('Perturbação do sossego', 'perturbacao-do-sossego', 'Situações que perturbem a tranquilidade coletiva.', 60),
  ('Veículo suspeito', 'veiculo-suspeito', 'Informações sobre veículo em situação suspeita.', 70),
  ('Pessoa em situação de risco', 'pessoa-em-situacao-de-risco', 'Informações sobre pessoa vulnerável ou em risco.', 80),
  ('Espaço público', 'espaco-publico', 'Ocorrências em praças, vias, parques e outros espaços públicos.', 90),
  ('Patrimônio público', 'patrimonio-publico', 'Informações sobre bens ou prédios públicos.', 100),
  ('Pessoa desaparecida', 'pessoa-desaparecida', 'Informações relacionadas a pessoa desaparecida.', 110),
  ('Outros', 'outros', 'Outras informações relevantes para a GCMJP.', 999)
on conflict (slug) do nothing;

commit;
