-- Fluxo operacional:
-- denúncia -> ADMIN/DIRETORIA faz triagem -> CHEFIA/COORDENAÇÃO do grupamento
-- -> chefia distribui para AGENTE/OPERADOR/INSPETOR.
-- Se o destino estiver incorreto, a chefia devolve para a fila central com justificativa.

alter table public.vortex_notifications drop constraint if exists vortex_notifications_type_check;
alter table public.vortex_notifications add constraint vortex_notifications_type_check
check (notification_type in ('NEW_REPORT','HIGH_URGENCY_REPORT','REPORT_ASSIGNED','STATUS_CHANGED','NEW_MESSAGE','REPORTER_REPLY','REPORT_ROUTED','REPORT_RETURNED'));

create or replace function public.vortex_route_report(p_report_id uuid,p_unit_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_role text;v_old uuid;v_protocol text;v_unit_name text;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_role not in('ADMIN','DIRETORIA') then raise exception 'not authorized';end if;
 select name into v_unit_name from public.vortex_units where id=p_unit_id and active;
 if v_unit_name is null then raise exception 'invalid unit';end if;
 select unit_id,protocol into v_old,v_protocol from public.vortex_reports where id=p_report_id for update;
 if not found then raise exception 'report not found';end if;if v_old=p_unit_id then return;end if;
 update public.vortex_reports set unit_id=p_unit_id,updated_at=now() where id=p_report_id;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
 values(v_uid,'REPORT_ROUTED','REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_unit_id',v_old,'unit_id',p_unit_id,'triage','MANUAL'));
 insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
 select p_report_id,m.profile_id,'REPORT_ROUTED','IN_APP','PENDING','Nova denúncia para sua coordenação',
 v_protocol||' foi encaminhada pela triagem para '||v_unit_name||'.'
 from public.vortex_unit_members m join public.vortex_profiles p on p.id=m.profile_id
 where m.unit_id=p_unit_id and m.member_role='COORDENADOR' and p.active;
end;$$;

create or replace function public.vortex_return_report_to_directorate(p_report_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_role text;v_unit uuid;v_protocol text;v_reason text:=btrim(coalesce(p_reason,''));
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_role<>'COORDENADOR' then raise exception 'not authorized';end if;
 if length(v_reason)<5 or length(v_reason)>1000 then raise exception 'invalid reason';end if;
 select unit_id,protocol into v_unit,v_protocol from public.vortex_reports where id=p_report_id for update;
 if not found or v_unit is null then raise exception 'report not routed';end if;
 if not exists(select 1 from public.vortex_unit_members where profile_id=v_uid and unit_id=v_unit and member_role='COORDENADOR') then raise exception 'coordinator outside unit';end if;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 update public.vortex_reports set unit_id=null,updated_at=now() where id=p_report_id;
 insert into public.vortex_report_history(report_id,old_status,new_status,note,changed_by)
 select p_report_id,status,status,'[Devolvida para triagem] '||v_reason,v_uid from public.vortex_reports where id=p_report_id;
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
 values(v_uid,'REPORT_RETURNED_TO_TRIAGE','REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_unit_id',v_unit,'reason',v_reason));
 insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
 select p_report_id,p.id,'REPORT_RETURNED','IN_APP','PENDING','Denúncia devolvida para triagem',
 v_protocol||' foi devolvida pela chefia/coordenação. Motivo: '||v_reason
 from public.vortex_profiles p where p.active and p.role::text in('ADMIN','DIRETORIA');
 return true;
end;$$;
revoke all on function public.vortex_return_report_to_directorate(uuid,text) from public;
grant execute on function public.vortex_return_report_to_directorate(uuid,text) to authenticated;

create or replace function public.vortex_assign_report(p_report_id uuid,p_assigned_to uuid)
returns text language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_current uuid;v_protocol text;v_role text;v_unit uuid;
begin
 select role::text into v_role from public.vortex_profiles where id=v_uid and active;
 if v_uid is null or v_role<>'COORDENADOR' then raise exception 'not authorized';end if;
 select protocol,unit_id into v_protocol,v_unit from public.vortex_reports where id=p_report_id;
 if not found then raise exception 'report not found';end if;
 if v_unit is null then raise exception 'report pending directorate triage';end if;
 if not exists(select 1 from public.vortex_unit_members where profile_id=v_uid and member_role='COORDENADOR' and unit_id=v_unit) then raise exception 'coordinator outside unit';end if;
 if not exists(select 1 from public.vortex_profiles p join public.vortex_unit_members m on m.profile_id=p.id where p.id=p_assigned_to and p.active and p.role::text='OPERADOR' and m.unit_id=v_unit and m.member_role='INSPETOR') then raise exception 'operator outside unit';end if;
 select assigned_to into v_current from public.vortex_report_assignments where report_id=p_report_id and ended_at is null for update;
 if v_current=p_assigned_to then return 'UNCHANGED';end if;
 update public.vortex_report_assignments set ended_at=now() where report_id=p_report_id and ended_at is null;
 insert into public.vortex_report_assignments(report_id,assigned_to,assigned_by) values(p_report_id,p_assigned_to,v_uid);
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
 values(v_uid,case when v_current is null then 'REPORT_ASSIGNED' else 'REPORT_REASSIGNED' end,'REPORT',p_report_id,jsonb_build_object('protocol',v_protocol,'previous_assigned_to',v_current,'assigned_to',p_assigned_to,'unit_id',v_unit));
 return 'ASSIGNED';
end;$$;
