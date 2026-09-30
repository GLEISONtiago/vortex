drop trigger if exists vortex_reports_route_unit on public.vortex_reports;
drop function if exists public.vortex_route_report_on_insert();
delete from public.vortex_category_routes;
update public.vortex_unit_members set can_triage=false where can_triage=true;
update public.vortex_reports r set unit_id=null,updated_at=now()
where r.unit_id is not null
and not exists(select 1 from public.vortex_report_assignments a where a.report_id=r.id and a.ended_at is null);
