create or replace function public.vortex_can_view_report(p_report_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select exists(select 1 from public.vortex_profiles p where p.id=auth.uid() and p.active and(
 p.role::text in('ADMIN','DIRETORIA')
 or(p.role::text='COORDENADOR' and exists(select 1 from public.vortex_unit_members m join public.vortex_reports r on r.id=p_report_id where m.profile_id=p.id and m.member_role='COORDENADOR' and m.unit_id=r.unit_id))
 or(p.role::text='OPERADOR' and exists(select 1 from public.vortex_report_assignments a where a.report_id=p_report_id and a.assigned_to=p.id and a.ended_at is null))
 ));
$$;

create or replace function public.vortex_assignment_candidates(p_report_id uuid)
returns table(id uuid,full_name text,functional_title text)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 with me as(select id,role::text role from public.vortex_profiles where id=auth.uid() and active),
 ru as(select unit_id from public.vortex_reports where id=p_report_id)
 select p.id,p.full_name,p.functional_title from public.vortex_profiles p,me,ru
 where p.active and p.role::text='OPERADOR' and ru.unit_id is not null
 and(me.role='ADMIN' or(me.role='COORDENADOR'
 and exists(select 1 from public.vortex_unit_members cm where cm.profile_id=me.id and cm.member_role='COORDENADOR' and cm.unit_id=ru.unit_id)
 and exists(select 1 from public.vortex_unit_members om where om.profile_id=p.id and om.member_role='INSPETOR' and om.unit_id=ru.unit_id)))
 order by p.full_name;
$$;
