drop policy if exists "Active staff view own profile and admins manage visibility" on public.vortex_profiles;
create policy "Active staff view own profile and admins manage visibility"
on public.vortex_profiles for select to authenticated
using (((id = (select auth.uid())) and active = true) or public.vortex_is_admin());

drop policy if exists "Authorized Vórtex staff can add report history" on public.vortex_report_history;
create policy "Authorized Vórtex staff can add report history"
on public.vortex_report_history for insert to authenticated
with check ((changed_by = (select auth.uid())) and public.vortex_can_view_report(report_id));

drop policy if exists "Recipients mark notifications read" on public.vortex_notifications;
create policy "Recipients mark notifications read"
on public.vortex_notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

drop policy if exists "Active staff view units" on public.vortex_units;
create policy "Active staff view units"
on public.vortex_units for select to authenticated
using (exists (
  select 1 from public.vortex_profiles p
  where p.id = (select auth.uid()) and p.active
));
