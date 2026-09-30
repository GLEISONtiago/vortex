-- Quatro níveis de visualização das denúncias:
-- 1. ADMIN: todas.
-- 2. DIRETORIA: todos os integrantes autorizados da Diretoria Operacional veem todas.
-- 3. COORDENADOR: chefes/coordenadores veem as denúncias dos grupamentos que coordenam.
-- 4. OPERADOR: agentes/operadores/inspetores veem somente denúncias atribuídas a si.
--
-- INTELIGENCIA foi um perfil intermediário temporário. Usuários existentes são
-- convertidos para COORDENADOR; o valor permanece no enum apenas por compatibilidade
-- histórica do PostgreSQL e não é oferecido pela aplicação.

update public.vortex_profiles
set role='COORDENADOR'::public.vortex_staff_role
where role::text='INTELIGENCIA';

create or replace function public.vortex_can_view_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path=pg_catalog,pg_temp
as $$
 select exists(
   select 1
   from public.vortex_profiles p
   where p.id=auth.uid()
     and p.active
     and (
       p.role::text in ('ADMIN','DIRETORIA')
       or (
         p.role::text='COORDENADOR'
         and exists(
           select 1
           from public.vortex_unit_members m
           join public.vortex_reports r on r.id=p_report_id
           where m.profile_id=p.id
             and m.member_role='COORDENADOR'
             and m.unit_id=r.unit_id
         )
       )
       or (
         p.role::text='OPERADOR'
         and exists(
           select 1
           from public.vortex_report_assignments a
           where a.report_id=p_report_id
             and a.assigned_to=p.id
             and a.ended_at is null
         )
       )
     )
 );
$$;

revoke all on function public.vortex_can_view_report(uuid) from public;
grant execute on function public.vortex_can_view_report(uuid) to authenticated;
