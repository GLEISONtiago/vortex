-- Chefe da Inteligência: visão global para análise, sem triagem ou distribuição.
create or replace function public.vortex_can_view_report(p_report_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
 select exists(
   select 1 from public.vortex_profiles p
   where p.id=auth.uid() and p.active and (
     p.role::text in ('ADMIN','DIRETORIA','INTELIGENCIA')
     or (
       p.role::text='COORDENADOR'
       and exists(
         select 1 from public.vortex_unit_members m
         join public.vortex_reports r on r.id=p_report_id
         where m.profile_id=p.id and m.member_role='COORDENADOR' and m.unit_id=r.unit_id
       )
     )
     or (
       p.role::text='OPERADOR'
       and exists(
         select 1 from public.vortex_report_assignments a
         where a.report_id=p_report_id and a.assigned_to=p.id and a.ended_at is null
       )
     )
   )
 );
$$;



create or replace function public.vortex_update_report_status(
  p_report_id uuid,
  p_new_status public.vortex_report_status,
  p_resolution text default null,
  p_note text default null
)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare
  v_uid uuid:=auth.uid(); v_role text; v_old public.vortex_report_status;
  v_protocol text; v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
  select role::text into v_role from public.vortex_profiles where id=v_uid and active;
  if v_uid is null or not public.vortex_can_view_report(p_report_id) then raise exception 'not authorized'; end if;
  if v_role not in ('ADMIN','COORDENADOR','OPERADOR') then raise exception 'role cannot update status'; end if;
  if v_role='OPERADOR' and not exists(
    select 1 from public.vortex_report_assignments
    where report_id=p_report_id and assigned_to=v_uid and ended_at is null
  ) then raise exception 'operator not assigned'; end if;
  if p_new_status::text not in ('NOVA','EM_ANALISE','EM_ATENDIMENTO','FINALIZADA') then raise exception 'invalid status'; end if;
  if p_new_status::text='FINALIZADA' and coalesce(p_resolution,'') not in
    ('PROCEDENTE','IMPROCEDENTE','RESOLVIDA','ENCAMINHADA_OUTRO_ORGAO','NAO_FOI_POSSIVEL_AVERIGUAR')
  then raise exception 'invalid resolution'; end if;
  if length(coalesce(v_note,''))>4000 then raise exception 'note too long'; end if;

  select status,protocol into v_old,v_protocol from public.vortex_reports where id=p_report_id for update;
  if not found then raise exception 'report not found'; end if;
  if v_old=p_new_status then return true; end if;

  update public.vortex_reports
  set status=p_new_status,
      resolution=case when p_new_status::text='FINALIZADA' then p_resolution else null end,
      updated_at=now()
  where id=p_report_id;

  insert into public.vortex_report_history(report_id,old_status,new_status,note,changed_by)
  values(
    p_report_id,v_old,p_new_status,
    case when p_new_status::text='FINALIZADA'
      then '[Resultado: '||p_resolution||']'||case when v_note is not null then ' '||v_note else '' end
      else v_note end,
    v_uid
  );

  insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(
    v_uid,
    case when p_new_status::text='FINALIZADA' then 'REPORT_FINALIZED' else 'STATUS_CHANGED' end,
    'REPORT',p_report_id,
    jsonb_build_object('protocol',v_protocol,'old_status',v_old::text,'new_status',p_new_status::text,'resolution',
      case when p_new_status::text='FINALIZADA' then p_resolution else null end)
  );
  return true;
end;
$$;
