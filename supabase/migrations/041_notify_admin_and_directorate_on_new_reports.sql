-- ADMIN e DIRETORIA recebem novas denúncias que aguardam triagem.
create or replace function public.vortex_notify_new_report()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','pg_temp'
as $$
begin
  insert into public.vortex_notifications(
    report_id,recipient_id,notification_type,channel,status,title,body
  )
  select
    new.id,
    p.id,
    case when new.urgency='HIGH' then 'HIGH_URGENCY_REPORT' else 'NEW_REPORT' end,
    'IN_APP',
    'PENDING',
    case when new.urgency='HIGH'
      then 'Nova denúncia de alta urgência aguardando triagem'
      else 'Nova denúncia aguardando triagem'
    end,
    new.protocol||' aguarda triagem.'
  from public.vortex_profiles p
  where p.active
    and p.role::text in ('ADMIN','DIRETORIA');

  return new;
end;
$$;

revoke all on function public.vortex_notify_new_report() from public, anon, authenticated;
