-- Corrige constraints legadas da tabela de notificações para suportar notificações internas.
alter table public.vortex_notifications drop constraint if exists vortex_notifications_channel_check;
alter table public.vortex_notifications add constraint vortex_notifications_channel_check check (channel in ('IN_APP','EMAIL'));
alter table public.vortex_notifications drop constraint if exists vortex_notifications_status_check;
alter table public.vortex_notifications add constraint vortex_notifications_status_check check (status in ('PENDING','SENT','FAILED','READ'));
alter table public.vortex_notifications drop constraint if exists vortex_notifications_type_check;
alter table public.vortex_notifications add constraint vortex_notifications_type_check check (notification_type in ('NEW_REPORT','HIGH_URGENCY_REPORT','REPORT_ASSIGNED','STATUS_CHANGED','NEW_MESSAGE','REPORTER_REPLY'));
