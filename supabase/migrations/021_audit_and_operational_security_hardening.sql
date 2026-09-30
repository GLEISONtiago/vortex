-- Auditoria e hardening operacional do VÓRTEX.
-- Escritas de status, histórico, mensagens e atribuições passam por RPCs validados.
-- Remove privilégios diretos amplos de anon/authenticated e mantém somente o necessário.
revoke all privileges on all tables in schema public from anon, authenticated;
grant select on public.vortex_categories to anon, authenticated;
grant select on public.vortex_profiles, public.vortex_reports, public.vortex_report_assignments,
  public.vortex_report_history, public.vortex_attachments, public.vortex_messages,
  public.vortex_notifications, public.vortex_supervisor_rules to authenticated;
grant update (read_at, status) on public.vortex_notifications to authenticated;
grant select on public.vortex_audit_log to authenticated;

drop policy if exists "Admins can view Vortex audit log" on public.vortex_audit_log;
create policy "Admins can view Vortex audit log" on public.vortex_audit_log
for select to authenticated using (public.vortex_is_admin());

-- Em produção esta migration também:
-- 1. altera vortex_record_status_change para registrar somente a criação;
-- 2. cria vortex_update_report_status(uuid,vortex_report_status,text,text);
-- 3. cria vortex_add_internal_note(uuid,text);
-- 4. cria vortex_send_staff_message(uuid,text);
-- 5. cria vortex_assign_report(uuid,uuid);
-- 6. cria auditoria automática de REPORT_CREATED e REPORTER_MESSAGE_RECEIVED;
-- 7. concede EXECUTE dos RPCs operacionais somente a authenticated.
--
-- As definições completas foram aplicadas via Supabase Migration API em 30/09/2026.
