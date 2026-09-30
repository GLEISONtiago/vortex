-- Estrutura de grupamentos, membros e triagem operacional.
-- Aplicada em produção como operational_units_and_triage.
-- Mantém os papéis de acesso ADMIN/COORDENADOR/OPERADOR e separa a lotação operacional em unidades.

create table public.vortex_units (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text,
 active boolean not null default true, is_default boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint vortex_units_code_check check(code~'^[A-Z0-9_]{2,40}$'),
 constraint vortex_units_name_check check(char_length(name) between 2 and 120)
);
create unique index vortex_units_one_default_idx on public.vortex_units(is_default) where is_default=true;

create table public.vortex_unit_members (
 unit_id uuid not null references public.vortex_units(id) on delete cascade,
 profile_id uuid not null references public.vortex_profiles(id) on delete cascade,
 member_role text not null check(member_role in('COORDENADOR','INSPETOR')),
 can_triage boolean not null default false, created_at timestamptz not null default now(),
 primary key(unit_id,profile_id),
 constraint vortex_unit_members_triage_check check(not can_triage or member_role='COORDENADOR')
);

create table public.vortex_category_routes (
 category_id uuid primary key references public.vortex_categories(id) on delete cascade,
 unit_id uuid not null references public.vortex_units(id) on delete restrict,
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.vortex_reports add column unit_id uuid references public.vortex_units(id) on delete restrict;
create index vortex_reports_unit_status_idx on public.vortex_reports(unit_id,status,created_at desc);
create index vortex_unit_members_profile_idx on public.vortex_unit_members(profile_id,unit_id);

insert into public.vortex_units(code,name,description,is_default) values
('GRUPO_OPERACIONAL','Grupo Operacional','Fila operacional geral e destino padrão para denúncias sem regra especializada.',true),
('MARIA_DA_PENHA','Maria da Penha','Atendimento especializado de ocorrências relacionadas à violência contra a mulher.',false),
('ROMU','ROMU — Ronda Ostensiva Municipal','Atendimento operacional especializado, inclusive ocorrências como tráfico, roubo e veículos suspeitos.',false),
('GAAM','GAAM — Grupamento Ambiental','Atendimento de ocorrências relacionadas à proteção ambiental.',false),
('RECOM','RECOM — Ronda Escolar Comunitária','Atendimento de ocorrências relacionadas ao ambiente escolar.',false);

insert into public.vortex_categories(name,slug,description,active,sort_order)
select v.name,v.slug,v.description,true,v.sort_order from (values
('Violência contra a mulher','violencia-contra-a-mulher','Violência doméstica, ameaça ou agressão contra a mulher.',35),
('Ocorrência ambiental','ocorrencia-ambiental','Situações relacionadas ao meio ambiente e à proteção ambiental.',85),
('Ocorrência em unidade escolar','ocorrencia-unidade-escolar','Situações relacionadas à segurança e convivência no ambiente escolar.',75)
) v(name,slug,description,sort_order)
where not exists(select 1 from public.vortex_categories c where c.slug=v.slug);

insert into public.vortex_category_routes(category_id,unit_id,active)
select c.id,u.id,true from public.vortex_categories c join public.vortex_units u on
(u.code='MARIA_DA_PENHA' and c.slug='violencia-contra-a-mulher') or
(u.code='GAAM' and c.slug='ocorrencia-ambiental') or
(u.code='RECOM' and c.slug='ocorrencia-unidade-escolar') or
(u.code='ROMU' and c.slug in('trafico-comercio-de-drogas','furto-roubo','veiculo-suspeito'));

create or replace function public.vortex_route_report_on_insert() returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 if new.unit_id is null then select r.unit_id into new.unit_id from public.vortex_category_routes r join public.vortex_units u on u.id=r.unit_id where r.category_id=new.category_id and r.active and u.active limit 1;end if;
 if new.unit_id is null then select id into new.unit_id from public.vortex_units where active and is_default limit 1;end if;
 return new;
end;$$;
create trigger vortex_reports_route_unit before insert on public.vortex_reports for each row execute function public.vortex_route_report_on_insert();

update public.vortex_reports r set unit_id=coalesce(
 (select cr.unit_id from public.vortex_category_routes cr join public.vortex_units u on u.id=cr.unit_id where cr.category_id=r.category_id and cr.active and u.active limit 1),
 (select id from public.vortex_units where active and is_default limit 1)
) where r.unit_id is null;

-- A migração de produção colocou coordenadores/operadores já existentes no Grupo Operacional para preservar o acesso.
insert into public.vortex_unit_members(unit_id,profile_id,member_role,can_triage)
select u.id,p.id,'COORDENADOR',true from public.vortex_units u cross join public.vortex_profiles p where u.is_default and p.active and p.role::text='COORDENADOR';
insert into public.vortex_unit_members(unit_id,profile_id,member_role,can_triage)
select u.id,p.id,'INSPETOR',false from public.vortex_units u cross join public.vortex_profiles p where u.is_default and p.active and p.role::text='OPERADOR';

alter table public.vortex_units enable row level security;
alter table public.vortex_unit_members enable row level security;
alter table public.vortex_category_routes enable row level security;
revoke all on public.vortex_units,public.vortex_unit_members,public.vortex_category_routes from anon,authenticated;
grant select on public.vortex_units to authenticated;
create policy "Active staff view units" on public.vortex_units for select to authenticated using(exists(select 1 from public.vortex_profiles p where p.id=auth.uid() and p.active));

create or replace function public.vortex_my_units() returns table(unit_id uuid,code text,name text,member_role text,can_triage boolean)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select u.id,u.code,u.name,m.member_role,m.can_triage from public.vortex_unit_members m join public.vortex_units u on u.id=m.unit_id join public.vortex_profiles p on p.id=m.profile_id
 where m.profile_id=auth.uid() and p.active and u.active order by u.name;
$$;
revoke all on function public.vortex_my_units() from public,anon; grant execute on function public.vortex_my_units() to authenticated;

create or replace function public.vortex_can_view_report(p_report_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select exists(select 1 from public.vortex_profiles p where p.id=auth.uid() and p.active and(
 p.role::text='ADMIN' or
 (p.role::text='COORDENADOR' and exists(select 1 from public.vortex_unit_members m join public.vortex_reports r on r.id=p_report_id where m.profile_id=p.id and m.member_role='COORDENADOR' and(m.can_triage or m.unit_id=r.unit_id))) or
 (p.role::text='OPERADOR' and exists(select 1 from public.vortex_report_assignments a where a.report_id=p_report_id and a.assigned_to=p.id and a.ended_at is null))));
$$;

create or replace function public.vortex_assignment_candidates(p_report_id uuid) returns table(id uuid,full_name text,functional_title text)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 with me as(select id,role::text role from public.vortex_profiles where id=auth.uid() and active),ru as(select unit_id from public.vortex_reports where id=p_report_id)
 select p.id,p.full_name,p.functional_title from public.vortex_profiles p,me,ru where p.active and p.role::text='OPERADOR' and(
 me.role='ADMIN' or(me.role='COORDENADOR'
 and exists(select 1 from public.vortex_unit_members cm where cm.profile_id=me.id and cm.member_role='COORDENADOR' and(cm.can_triage or cm.unit_id=ru.unit_id))
 and exists(select 1 from public.vortex_unit_members om where om.profile_id=p.id and om.unit_id=ru.unit_id and om.member_role='INSPETOR')))
 order by p.full_name;
$$;
revoke all on function public.vortex_assignment_candidates(uuid) from public,anon; grant execute on function public.vortex_assignment_candidates(uuid) to authenticated;

create or replace function public.vortex_assign_report(p_report_id uuid,p_assigned_to uuid) returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_current uuid;v_protocol text;v_role text;v_unit uuid;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_uid is null or v_role not in('ADMIN','COORDENADOR') then raise exception 'not authorized';end if;
 select protocol,unit_id into v_protocol,v_unit from public.vortex_reports where id=p_report_id;if not found then raise exception 'report not found';end if;
 if not exists(select 1 from public.vortex_profiles where id=p_assigned_to and active and role::text='OPERADOR') then raise exception 'invalid operator';end if;
 if v_role='COORDENADOR' then
  if not exists(select 1 from public.vortex_unit_members where profile_id=v_uid and member_role='COORDENADOR' and(can_triage or unit_id=v_unit)) then raise exception 'coordinator outside unit';end if;
  if not exists(select 1 from public.vortex_unit_members where profile_id=p_assigned_to and member_role='INSPETOR' and unit_id=v_unit) then raise exception 'operator outside unit';end if;
 end if;
 select assigned_to into v_current from public.vortex_report_assignments where report_id=p_report_id and ended_at is null for update;
 if v_current=p_assigned_to then return 'UNCHANGED';end if;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 insert into public.vortex_report_assignments(report_id,assigned_to,assigned_by) values(p_report_id,p_assigned_to,v_uid);
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata) values(v_uid,case when v_current is null then 'REPORT_ASSIGNED' else 'REPORT_REASSIGNED' end,'REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_assigned_to',v_current,'assigned_to',p_assigned_to,'unit_id',v_unit));
 return 'ASSIGNED';
end;$$;

create or replace function public.vortex_route_report(p_report_id uuid,p_unit_id uuid) returns void language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_role text;v_old uuid;v_protocol text;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_role='ADMIN' then null;elsif v_role='COORDENADOR' and exists(select 1 from public.vortex_unit_members where profile_id=v_uid and member_role='COORDENADOR' and can_triage) then null;else raise exception 'not authorized';end if;
 if not exists(select 1 from public.vortex_units where id=p_unit_id and active) then raise exception 'invalid unit';end if;
 select unit_id,protocol into v_old,v_protocol from public.vortex_reports where id=p_report_id for update;if not found then raise exception 'report not found';end if;
 if v_old=p_unit_id then return;end if;
 update public.vortex_reports set unit_id=p_unit_id,updated_at=now() where id=p_report_id;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata) values(v_uid,'REPORT_ROUTED','REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_unit_id',v_old,'unit_id',p_unit_id));
end;$$;
revoke all on function public.vortex_route_report(uuid,uuid) from public,anon; grant execute on function public.vortex_route_report(uuid,uuid) to authenticated;

create or replace function public.vortex_notify_new_report() returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
begin
 insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
 select distinct new.id,p.id,case when new.urgency='HIGH' then 'HIGH_URGENCY_REPORT' else 'NEW_REPORT' end,'IN_APP','PENDING',
 case when new.urgency='HIGH' then 'Nova denúncia de alta urgência' else 'Nova denúncia recebida' end,new.protocol||' entrou na fila operacional.'
 from public.vortex_profiles p where p.active and(p.role::text='ADMIN' or(p.role::text='COORDENADOR' and exists(select 1 from public.vortex_unit_members m where m.profile_id=p.id and m.member_role='COORDENADOR' and(m.can_triage or m.unit_id=new.unit_id))));
 return new;
end;$$;
