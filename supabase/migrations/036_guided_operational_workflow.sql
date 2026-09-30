alter table public.vortex_reports
  add column if not exists operational_priority public.vortex_urgency,
  add column if not exists awaiting_reporter_info boolean not null default false,
  add column if not exists awaiting_reporter_info_since timestamptz,
  add column if not exists forwarded_agency text;

alter table public.vortex_reports
  drop constraint if exists vortex_reports_forwarded_agency_length;
alter table public.vortex_reports
  add constraint vortex_reports_forwarded_agency_length
  check (forwarded_agency is null or char_length(forwarded_agency) <= 200);

create or replace function public.vortex_set_operational_priority(p_report_id uuid,p_priority text)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','pg_temp'
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_priority public.vortex_urgency;
begin
  if v_uid is null then raise exception 'not authorized'; end if;
  select role::text into v_role from public.vortex_profiles where id=v_uid and active=true;
  if v_role <> 'DIRETORIA' then raise exception 'not authorized'; end if;
  if upper(coalesce(p_priority,'')) not in ('LOW','MEDIUM','HIGH') then raise exception 'invalid priority'; end if;
  v_priority:=upper(p_priority)::public.vortex_urgency;
  update public.vortex_reports set operational_priority=v_priority,updated_at=now() where id=p_report_id;
  if not found then raise exception 'report not found'; end if;
  insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(v_uid,'OPERATIONAL_PRIORITY_SET','REPORT',p_report_id,jsonb_build_object('priority',v_priority::text));
  return true;
end;
$$;

create or replace function public.vortex_set_awaiting_reporter_info(p_report_id uuid,p_waiting boolean)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','pg_temp'
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null or not public.vortex_can_view_report(p_report_id) then raise exception 'not authorized'; end if;
  update public.vortex_reports set awaiting_reporter_info=coalesce(p_waiting,false),awaiting_reporter_info_since=case when coalesce(p_waiting,false) then coalesce(awaiting_reporter_info_since,now()) else null end,updated_at=now() where id=p_report_id;
  if not found then raise exception 'report not found'; end if;
  insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(v_uid,case when p_waiting then 'REPORTER_INFO_REQUESTED' else 'REPORTER_INFO_WAIT_CLEARED' end,'REPORT',p_report_id,'{}'::jsonb);
  return true;
end;
$$;

create or replace function public.vortex_clear_waiting_on_reporter_reply()
returns trigger language plpgsql security definer set search_path to 'pg_catalog','pg_temp'
as $$
begin
  if new.sender_type::text='REPORTER' then
    update public.vortex_reports set awaiting_reporter_info=false,awaiting_reporter_info_since=null,updated_at=now() where id=new.report_id and awaiting_reporter_info=true;
  end if;
  return new;
end;
$$;

drop trigger if exists vortex_clear_waiting_on_reporter_reply_trigger on public.vortex_messages;
create trigger vortex_clear_waiting_on_reporter_reply_trigger after insert on public.vortex_messages for each row execute function public.vortex_clear_waiting_on_reporter_reply();

create or replace function public.vortex_finalize_report(p_report_id uuid,p_resolution text,p_summary text,p_message text,p_forwarded_agency text default null)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','pg_temp'
as $$
declare v_summary text:=btrim(coalesce(p_summary,'')); v_message text:=btrim(coalesce(p_message,'')); v_agency text:=nullif(btrim(coalesce(p_forwarded_agency,'')),'');
begin
  if p_resolution not in ('PROCEDENTE','IMPROCEDENTE','RESOLVIDA','ENCAMINHADA_OUTRO_ORGAO','NAO_FOI_POSSIVEL_AVERIGUAR') then raise exception 'invalid resolution'; end if;
  if char_length(v_summary) not between 10 and 2000 then raise exception 'invalid summary'; end if;
  if char_length(v_message) not between 2 and 2000 then raise exception 'invalid message'; end if;
  if p_resolution='ENCAMINHADA_OUTRO_ORGAO' and v_agency is null then raise exception 'agency required'; end if;
  if v_agency is not null and char_length(v_agency)>200 then raise exception 'invalid agency'; end if;
  perform public.vortex_update_report_status(p_report_id,'FINALIZADA'::public.vortex_report_status,p_resolution,case when v_agency is not null then v_summary || E'\nÓrgão de destino: ' || v_agency else v_summary end);
  update public.vortex_reports set forwarded_agency=case when p_resolution='ENCAMINHADA_OUTRO_ORGAO' then v_agency else null end,awaiting_reporter_info=false,awaiting_reporter_info_since=null,updated_at=now() where id=p_report_id;
  perform public.vortex_send_staff_message(p_report_id,v_message);
  return true;
end;
$$;

revoke all on function public.vortex_set_operational_priority(uuid,text) from public;
revoke all on function public.vortex_set_awaiting_reporter_info(uuid,boolean) from public;
revoke all on function public.vortex_finalize_report(uuid,text,text,text,text) from public;
grant execute on function public.vortex_set_operational_priority(uuid,text) to authenticated;
grant execute on function public.vortex_set_awaiting_reporter_info(uuid,boolean) to authenticated;
grant execute on function public.vortex_finalize_report(uuid,text,text,text,text) to authenticated;
