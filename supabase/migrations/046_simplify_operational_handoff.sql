-- Make the operational status follow the real handoff between roles.
-- NOVA -> ENCAMINHADA when Admin/Diretoria routes to a unit.
-- ENCAMINHADA -> EM_ANALISE when Coordenação assigns an operator.

create or replace function public.vortex_route_report(p_report_id uuid, p_unit_id uuid)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','pg_temp'
as $function$
declare
 v_uid uuid:=auth.uid(); v_role text; v_old uuid; v_protocol text; v_unit_name text;
 v_old_status public.vortex_report_status;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_role not in('ADMIN','DIRETORIA') then raise exception 'not authorized'; end if;
 select name into v_unit_name from public.vortex_units where id=p_unit_id and active;
 if v_unit_name is null then raise exception 'invalid unit'; end if;
 select unit_id,protocol,status into v_old,v_protocol,v_old_status from public.vortex_reports where id=p_report_id for update;
 if not found then raise exception 'report not found'; end if;
 if v_old_status='FINALIZADA' then raise exception 'finalized report cannot be routed'; end if;
 if v_old=p_unit_id and v_old_status='ENCAMINHADA' then return; end if;

 update public.vortex_reports set unit_id=p_unit_id,status='ENCAMINHADA',updated_at=now() where id=p_report_id;
 update public.vortex_report_assignments set ended_at=now()
 where report_id=p_report_id and ended_at is null and v_old is distinct from p_unit_id;

 if v_old_status<>'ENCAMINHADA' then
  insert into public.vortex_report_history(report_id,old_status,new_status,note,changed_by)
  values(p_report_id,v_old_status,'ENCAMINHADA','Encaminhada para '||v_unit_name||'.',v_uid);
 end if;

 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
 values(v_uid,'REPORT_ROUTED','REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_unit_id',v_old,'unit_id',p_unit_id,'triage','MANUAL'));

 insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
 select p_report_id,m.profile_id,'REPORT_ROUTED','IN_APP','PENDING','Nova denúncia para sua coordenação',
 v_protocol||' foi encaminhada pela triagem para '||v_unit_name||'.'
 from public.vortex_unit_members m join public.vortex_profiles p on p.id=m.profile_id
 where m.unit_id=p_unit_id and m.member_role='COORDENADOR' and p.active;
end;
$function$;

create or replace function public.vortex_assign_report(p_report_id uuid, p_assigned_to uuid)
returns text
language plpgsql
security definer
set search_path to 'pg_catalog','pg_temp'
as $function$
declare
 v_uid uuid:=auth.uid(); v_current uuid; v_protocol text; v_role text; v_unit uuid;
 v_status public.vortex_report_status;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_uid is null or v_role<>'COORDENADOR' then raise exception 'not authorized';end if;
 select protocol,unit_id,status into v_protocol,v_unit,v_status from public.vortex_reports where id=p_report_id for update;
 if not found then raise exception 'report not found';end if;
 if v_unit is null then raise exception 'report pending directorate triage';end if;
 if v_status='FINALIZADA' then raise exception 'finalized report cannot be assigned';end if;
 if not exists(select 1 from public.vortex_unit_members where profile_id=v_uid and member_role='COORDENADOR' and unit_id=v_unit) then raise exception 'coordinator outside unit';end if;
 if not exists(select 1 from public.vortex_profiles p join public.vortex_unit_members m on m.profile_id=p.id where p.id=p_assigned_to and p.active and p.role::text='OPERADOR' and m.unit_id=v_unit and m.member_role='INSPETOR') then raise exception 'operator outside unit';end if;
 select assigned_to into v_current from public.vortex_report_assignments where report_id=p_report_id and ended_at is null for update;
 if v_current=p_assigned_to then return 'UNCHANGED';end if;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 insert into public.vortex_report_assignments(report_id,assigned_to,assigned_by) values(p_report_id,p_assigned_to,v_uid);

 if v_status in ('NOVA','ENCAMINHADA') then
  update public.vortex_reports set status='EM_ANALISE',updated_at=now() where id=p_report_id;
  insert into public.vortex_report_history(report_id,old_status,new_status,note,changed_by)
  values(p_report_id,v_status,'EM_ANALISE','Responsável definido pela chefia/coordenação.',v_uid);
 end if;

 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
 values(v_uid,case when v_current is null then 'REPORT_ASSIGNED' else 'REPORT_REASSIGNED' end,'REPORT',p_report_id,
 jsonb_build_object('protocol',v_protocol,'previous_assigned_to',v_current,'assigned_to',p_assigned_to,'unit_id',v_unit));
 return 'ASSIGNED';
end;
$function$;

update public.vortex_reports r set status='ENCAMINHADA',updated_at=now()
where r.status='NOVA' and r.unit_id is not null
and not exists(select 1 from public.vortex_report_assignments a where a.report_id=r.id and a.ended_at is null);
