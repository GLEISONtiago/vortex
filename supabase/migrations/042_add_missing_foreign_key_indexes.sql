-- Índices de apoio às FKs sinalizadas pelo advisor de performance.
create index if not exists vortex_backup_batches_created_by_idx
  on public.vortex_backup_batches(created_by);
create index if not exists vortex_category_routes_unit_id_idx
  on public.vortex_category_routes(unit_id);
create index if not exists vortex_pending_attachments_report_id_idx
  on public.vortex_pending_attachments(report_id);
create index if not exists vortex_public_updates_created_by_idx
  on public.vortex_public_updates(created_by);
create index if not exists vortex_report_assignments_assigned_by_idx
  on public.vortex_report_assignments(assigned_by);
create index if not exists vortex_report_history_changed_by_idx
  on public.vortex_report_history(changed_by);
create index if not exists vortex_upload_sessions_report_id_idx
  on public.vortex_upload_sessions(report_id);
