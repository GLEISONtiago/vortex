-- Chefe da Inteligência: visão global para análise, sem triagem ou distribuição.
create or replace function public.vortex_can_view_report(p_report_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select exists(
   select 1 from public.vortex_profiles p
   where p.id=auth.uid() and p.active and (
     p.role::text in ('ADMIN','DIRETORIA','INTELIGENCIA')
     or (
       p.role::text='COORDENADOR'
       and exists(
         select 1 from public.vortex_unit_members m
         join public.vortex_reports r on r.id=p_report_id
         where m.profile_id=p.id and m.member_role='COORDENADOR' and m.unit_id=r.unit_id
       )
     )
     or (
       p.role::text='OPERADOR'
       and exists(
         select 1 from public.vortex_report_assignments a
         where a.report_id=p_report_id and a.assigned_to=p.id and a.ended_at is null
       )
     )
   )
 );
$$;

-- A função de atualização de status em produção também valida explicitamente
-- ADMIN/COORDENADOR/OPERADOR. DIRETORIA e INTELIGENCIA permanecem fora da
-- execução do atendimento, embora possam acompanhar e registrar análise interna.
