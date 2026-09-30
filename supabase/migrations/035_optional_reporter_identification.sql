alter table public.vortex_reports
  add column if not exists reporter_name text,
  add column if not exists reporter_phone text,
  add column if not exists reporter_email text;

alter table public.vortex_reports drop constraint if exists vortex_reports_reporter_contact_check;
alter table public.vortex_reports add constraint vortex_reports_reporter_contact_check check (
  (reporter_name is null or char_length(reporter_name) <= 160) and
  (reporter_phone is null or char_length(reporter_phone) <= 30) and
  (reporter_email is null or char_length(reporter_email) <= 254)
);

create or replace function public.vortex_submit_public_report_with_upload(
  p_category_slug text, p_description text, p_urgency text, p_address text,
  p_neighborhood text, p_reference_point text, p_latitude numeric, p_longitude numeric,
  p_event_at timestamptz, p_tracking_pin text, p_reporter_name text,
  p_reporter_phone text, p_reporter_email text
) returns table(protocol text, tracking_code text, status public.vortex_report_status, created_at timestamptz, upload_token text, upload_expires_at timestamptz)
language plpgsql security definer set search_path to 'pg_catalog','pg_temp'
as $$
declare v_protocol text; v_tracking_code text; v_status public.vortex_report_status; v_created_at timestamptz; v_report_id uuid; v_token text; v_expires_at timestamptz;
begin
  if p_reporter_name is not null and char_length(btrim(p_reporter_name)) > 160 then raise exception 'Dados de identificação inválidos.'; end if;
  if p_reporter_phone is not null and char_length(btrim(p_reporter_phone)) > 30 then raise exception 'Dados de identificação inválidos.'; end if;
  if p_reporter_email is not null and (char_length(btrim(p_reporter_email)) > 254 or btrim(p_reporter_email) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then raise exception 'Dados de identificação inválidos.'; end if;
  select r.protocol,r.tracking_code,r.status,r.created_at into v_protocol,v_tracking_code,v_status,v_created_at
  from public.vortex_submit_public_report(p_category_slug,p_description,p_urgency,p_address,p_neighborhood,p_reference_point,p_latitude,p_longitude,p_event_at,p_tracking_pin) r;
  select id into v_report_id from public.vortex_reports where vortex_reports.protocol=v_protocol;
  if v_report_id is null then raise exception 'Não foi possível registrar a denúncia.'; end if;
  update public.vortex_reports set reporter_name=nullif(btrim(p_reporter_name),''),reporter_phone=nullif(btrim(p_reporter_phone),''),reporter_email=nullif(lower(btrim(p_reporter_email)),'') where id=v_report_id;
  v_token:=encode(extensions.gen_random_bytes(32),'hex'); v_expires_at:=now()+interval '15 minutes';
  insert into public.vortex_upload_sessions(report_id,token_hash,expires_at) values(v_report_id,encode(extensions.digest(v_token,'sha256'),'hex'),v_expires_at);
  protocol:=v_protocol; tracking_code:=v_tracking_code; status:=v_status; created_at:=v_created_at; upload_token:=v_token; upload_expires_at:=v_expires_at; return next;
exception when others then raise exception using errcode='P0001',message='Não foi possível registrar a denúncia.';
end; $$;

revoke all on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text,text,text,text) from public;
grant execute on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text,text,text,text) to anon,authenticated;
