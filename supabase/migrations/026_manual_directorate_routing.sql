create or replace function public.vortex_route_report(p_report_id uuid,p_unit_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_role text;v_old uuid;v_protocol text;v_unit_name text;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_role not in('ADMIN','DIRETORIA') then raise exception 'not authorized';end if;
 select name into v_unit_name from public.vortex_units where id=p_unit_id and active;
 if v_unit_name is null then raise exception 'invalid unit';end if;
 select unit_id,protocol into v_old,v_protocol from public.vortex_reports where id=p_report_id for update;
 if not found then raise exception 'report not found';end if;
 if v_old=p_unit_id then return;end if;
 update public.vortex_reports set unit_id=p_unit_id,updated_at=now() where id=p_report_id;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
 values(v_uid,'REPORT_ROUTED','REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_unit_id',v_old,'unit_id',p_unit_id,'triage','MANUAL'));
 insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
 select p_report_id,m.profile_id,'REPORT_ROUTED','IN_APP','PENDING','Denúncia encaminhada ao seu grupamento',
 v_protocol||' foi encaminhada pela Diretoria Operacional para '||v_unit_name||'.'
 from public.vortex_unit_members m join public.vortex_profiles p on p.id=m.profile_id
 where m.unit_id=p_unit_id and m.member_role='COORDENADOR' and p.active and m.profile_id<>v_uid;
end;$$;
