-- Permite uma conversa contínua no acompanhamento público.
-- Cada envio é uma nova linha em vortex_messages; não substitui mensagens anteriores.
-- A equipe responsável pelo estágio atual recebe notificação.
create or replace function public.vortex_send_public_report_message(p_protocol text,p_tracking_pin text,p_message text)
returns boolean language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_report_id uuid;v_protocol text;v_unit uuid;v_body text:=btrim(coalesce(p_message,''));
begin
 if coalesce(p_protocol,'')='' or coalesce(p_tracking_pin,'') !~ '^[0-9]{6}$' or length(v_body) not between 2 and 2000 then return false;end if;
 select r.id,r.protocol,r.unit_id into v_report_id,v_protocol,v_unit from public.vortex_reports r
 where upper(r.protocol)=upper(btrim(p_protocol)) and r.tracking_pin_hash is not null
 and extensions.crypt(p_tracking_pin,r.tracking_pin_hash)=r.tracking_pin_hash;
 if v_report_id is null then return false;end if;
 insert into public.vortex_messages(report_id,sender_type,message) values(v_report_id,'REPORTER',v_body);
 insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
 select v_report_id,a.assigned_to,'REPORTER_REPLY','IN_APP','PENDING','Nova mensagem do denunciante',v_protocol||' recebeu uma nova mensagem no acompanhamento.'
 from public.vortex_report_assignments a join public.vortex_profiles p on p.id=a.assigned_to and p.active
 where a.report_id=v_report_id and a.ended_at is null;
 if not exists(select 1 from public.vortex_report_assignments a where a.report_id=v_report_id and a.ended_at is null) and v_unit is not null then
  insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
  select v_report_id,m.profile_id,'REPORTER_REPLY','IN_APP','PENDING','Nova mensagem do denunciante',v_protocol||' recebeu uma nova mensagem no acompanhamento.'
  from public.vortex_unit_members m join public.vortex_profiles p on p.id=m.profile_id and p.active
  where m.unit_id=v_unit and m.member_role='COORDENADOR';
 end if;
 if v_unit is null then
  insert into public.vortex_notifications(report_id,recipient_id,notification_type,channel,status,title,body)
  select v_report_id,p.id,'REPORTER_REPLY','IN_APP','PENDING','Nova mensagem do denunciante',v_protocol||' recebeu uma nova mensagem enquanto aguarda triagem.'
  from public.vortex_profiles p where p.active and p.role::text in('ADMIN','DIRETORIA');
 end if;
 return true;
exception when others then return false;
end;$$;
revoke all on function public.vortex_send_public_report_message(text,text,text) from public;
grant execute on function public.vortex_send_public_report_message(text,text,text) to anon,authenticated;
