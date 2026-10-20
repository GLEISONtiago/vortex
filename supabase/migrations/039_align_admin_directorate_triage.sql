-- Alinha a triagem operacional: ADMIN e DIRETORIA podem encaminhar e definir prioridade.
create or replace function public.vortex_set_operational_priority(p_report_id uuid,p_priority text)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','pg_temp'
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_priority public.vortex_urgency;
begin
  if v_uid is null then raise exception 'not authorized'; end if;
  select role::text into v_role from public.vortex_profiles where id=v_uid and active=true;
  if v_role not in ('ADMIN','DIRETORIA') then raise exception 'not authorized'; end if;
  if upper(coalesce(p_priority,'')) not in ('LOW','MEDIUM','HIGH') then raise exception 'invalid priority'; end if;
  v_priority:=upper(p_priority)::public.vortex_urgency;
  update public.vortex_reports set operational_priority=v_priority,updated_at=now() where id=p_report_id;
  if not found then raise exception 'report not found'; end if;
  insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(v_uid,'OPERATIONAL_PRIORITY_SET','REPORT',p_report_id,jsonb_build_object('priority',v_priority::text));
  return true;
end;
$$;
revoke all on function public.vortex_set_operational_priority(uuid,text) from public;
revoke all on function public.vortex_set_operational_priority(uuid,text) from anon,authenticated;
grant execute on function public.vortex_set_operational_priority(uuid,text) to authenticated;
