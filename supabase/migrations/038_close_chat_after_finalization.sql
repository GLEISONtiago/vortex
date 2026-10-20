-- Encerra o chat operacional quando a denúncia é finalizada.
-- O cidadão pode complementar livremente enquanto o atendimento estiver ativo.
-- A mensagem final da equipe é gravada antes da mudança para FINALIZADA.

create or replace function public.vortex_send_public_report_message(
  p_protocol text,
  p_tracking_pin text,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog','pg_temp'
as $$
declare
  v_report_id uuid;
  v_protocol text;
  v_unit uuid;
  v_status public.vortex_report_status;
  v_body text := btrim(coalesce(p_message,''));
begin
  if coalesce(p_protocol,'') = ''
     or coalesce(p_tracking_pin,'') !~ '^[0-9]{6}$'
     or length(v_body) not between 2 and 2000 then
    return false;
  end if;

  select r.id, r.protocol, r.unit_id, r.status
    into v_report_id, v_protocol, v_unit, v_status
  from public.vortex_reports r
  where upper(r.protocol) = upper(btrim(p_protocol))
    and r.tracking_pin_hash is not null
    and extensions.crypt(p_tracking_pin, r.tracking_pin_hash) = r.tracking_pin_hash;

  if v_report_id is null or v_status = 'FINALIZADA'::public.vortex_report_status then
    return false;
  end if;

  insert into public.vortex_messages(report_id, sender_type, message)
  values (v_report_id, 'REPORTER', v_body);

  insert into public.vortex_notifications(
    report_id, recipient_id, notification_type, channel, status, title, body
  )
  select
    v_report_id, a.assigned_to, 'REPORTER_REPLY', 'IN_APP', 'PENDING',
    'Nova mensagem do denunciante',
    v_protocol || ' recebeu uma nova mensagem no acompanhamento.'
  from public.vortex_report_assignments a
  join public.vortex_profiles p on p.id = a.assigned_to and p.active
  where a.report_id = v_report_id
    and a.ended_at is null;

  if not exists (
    select 1
    from public.vortex_report_assignments a
    where a.report_id = v_report_id
      and a.ended_at is null
  ) and v_unit is not null then
    insert into public.vortex_notifications(
      report_id, recipient_id, notification_type, channel, status, title, body
    )
    select
      v_report_id, m.profile_id, 'REPORTER_REPLY', 'IN_APP', 'PENDING',
      'Nova mensagem do denunciante',
      v_protocol || ' recebeu uma nova mensagem no acompanhamento.'
    from public.vortex_unit_members m
    join public.vortex_profiles p on p.id = m.profile_id and p.active
    where m.unit_id = v_unit
      and m.member_role = 'COORDENADOR';
  end if;

  if v_unit is null then
    insert into public.vortex_notifications(
      report_id, recipient_id, notification_type, channel, status, title, body
    )
    select
      v_report_id, p.id, 'REPORTER_REPLY', 'IN_APP', 'PENDING',
      'Nova mensagem do denunciante',
      v_protocol || ' recebeu uma nova mensagem enquanto aguarda triagem.'
    from public.vortex_profiles p
    where p.active
      and p.role::text in ('ADMIN','DIRETORIA');
  end if;

  return true;
end;
$$;

create or replace function public.vortex_send_staff_message(
  p_report_id uuid,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_protocol text;
  v_status public.vortex_report_status;
  v_message text := btrim(coalesce(p_message,''));
begin
  if v_uid is null or not public.vortex_can_view_report(p_report_id) then
    raise exception 'not authorized';
  end if;
  if length(v_message) not between 2 and 2000 then
    raise exception 'invalid message';
  end if;

  select protocol, status into v_protocol, v_status
  from public.vortex_reports
  where id = p_report_id;

  if not found then raise exception 'report not found'; end if;
  if v_status = 'FINALIZADA'::public.vortex_report_status then
    raise exception 'report finalized';
  end if;

  insert into public.vortex_messages(report_id,sender_type,message)
  values(p_report_id,'STAFF',v_message);

  insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(v_uid,'STAFF_MESSAGE_SENT','REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'length',length(v_message)));

  return true;
end;
$$;

create or replace function public.vortex_finalize_report(
  p_report_id uuid,
  p_resolution text,
  p_summary text,
  p_message text,
  p_forwarded_agency text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog','pg_temp'
as $$
declare
  v_summary text := btrim(coalesce(p_summary,''));
  v_message text := btrim(coalesce(p_message,''));
  v_agency text := nullif(btrim(coalesce(p_forwarded_agency,'')),'');
begin
  if p_resolution not in ('PROCEDENTE','IMPROCEDENTE','RESOLVIDA','ENCAMINHADA_OUTRO_ORGAO','NAO_FOI_POSSIVEL_AVERIGUAR') then raise exception 'invalid resolution'; end if;
  if char_length(v_summary) not between 10 and 2000 then raise exception 'invalid summary'; end if;
  if char_length(v_message) not between 2 and 2000 then raise exception 'invalid message'; end if;
  if p_resolution='ENCAMINHADA_OUTRO_ORGAO' and v_agency is null then raise exception 'agency required'; end if;
  if v_agency is not null and char_length(v_agency)>200 then raise exception 'invalid agency'; end if;

  perform public.vortex_send_staff_message(p_report_id,v_message);

  perform public.vortex_update_report_status(
    p_report_id,
    'FINALIZADA'::public.vortex_report_status,
    p_resolution,
    case when v_agency is not null then v_summary || E'\nÓrgão de destino: ' || v_agency else v_summary end
  );

  update public.vortex_reports
     set forwarded_agency=case when p_resolution='ENCAMINHADA_OUTRO_ORGAO' then v_agency else null end,
         awaiting_reporter_info=false,
         awaiting_reporter_info_since=null,
         updated_at=now()
   where id=p_report_id;

  return true;
end;
$$;

revoke all on function public.vortex_send_public_report_message(text,text,text) from public;
revoke all on function public.vortex_send_public_report_message(text,text,text) from anon, authenticated;
grant execute on function public.vortex_send_public_report_message(text,text,text) to anon, authenticated;

revoke all on function public.vortex_send_staff_message(uuid,text) from public;
revoke all on function public.vortex_send_staff_message(uuid,text) from anon, authenticated;
grant execute on function public.vortex_send_staff_message(uuid,text) to authenticated;

revoke all on function public.vortex_finalize_report(uuid,text,text,text,text) from public;
revoke all on function public.vortex_finalize_report(uuid,text,text,text,text) from anon, authenticated;
grant execute on function public.vortex_finalize_report(uuid,text,text,text,text) to authenticated;
