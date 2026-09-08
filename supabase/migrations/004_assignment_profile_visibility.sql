begin;
grant select on public.vortex_profiles to authenticated;
create function public.vortex_can_list_assignment_profiles() returns boolean language sql stable security definer set search_path = pg_catalog, pg_temp as $$ select exists(select 1 from public.vortex_profiles where id=auth.uid() and active and role in ('ADMIN','COORDENADOR')) $$;
revoke execute on function public.vortex_can_list_assignment_profiles() from public, anon;
grant execute on function public.vortex_can_list_assignment_profiles() to authenticated;
create policy "Assignment managers view active staff" on public.vortex_profiles for select to authenticated using (active = true and public.vortex_can_list_assignment_profiles());
commit;
