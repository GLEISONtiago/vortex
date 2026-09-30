-- Permissões de escrita para o fluxo operacional interno.
-- Aplicada no Supabase em 30/09/2026.
begin;

grant update on table public.vortex_reports to authenticated;
grant insert on table public.vortex_report_history to authenticated;
grant insert on table public.vortex_messages to authenticated;

drop policy if exists "Authorized Vórtex staff can update reports" on public.vortex_reports;
create policy "Authorized Vórtex staff can update reports"
on public.vortex_reports for update to authenticated
using (public.vortex_can_view_report(id))
with check (public.vortex_can_view_report(id));

drop policy if exists "Authorized Vórtex staff can add report history" on public.vortex_report_history;
create policy "Authorized Vórtex staff can add report history"
on public.vortex_report_history for insert to authenticated
with check (changed_by = auth.uid() and public.vortex_can_view_report(report_id));

drop policy if exists "Authorized Vórtex staff can send messages" on public.vortex_messages;
create policy "Authorized Vórtex staff can send messages"
on public.vortex_messages for insert to authenticated
with check (sender_type = 'STAFF' and public.vortex_can_view_report(report_id));

commit;
