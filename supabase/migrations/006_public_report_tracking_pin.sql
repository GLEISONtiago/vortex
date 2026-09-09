begin;

alter table public.vortex_reports add column tracking_pin_hash text;

create function public.vortex_submit_public_report(
  p_category_slug text,
  p_description text,
  p_urgency text,
  p_address text default null,
  p_neighborhood text default null,
  p_reference_point text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_event_at timestamptz default null,
  p_tracking_pin text default null
)
returns table(protocol text, tracking_code text, status public.vortex_report_status, created_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, pg_temp
as $$
declare v_category_id uuid; v_urgency public.vortex_urgency; v_code text; v_report public.vortex_reports%rowtype;
begin
  if coalesce(p_tracking_pin, '') !~ '^[0-9]{6}$' or p_description is null or length(btrim(p_description)) < 10 or length(p_description) > 5000 then
    raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.';
  end if;
  if upper(coalesce(p_urgency, '')) not in ('LOW','MEDIUM','HIGH') then raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.'; end if;
  if (p_latitude is null) <> (p_longitude is null) or (p_latitude is not null and (p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180)) then raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.'; end if;
  select id into v_category_id from public.vortex_categories where slug = p_category_slug and active;
  if v_category_id is null then raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.'; end if;
  v_urgency := upper(p_urgency)::public.vortex_urgency; v_code := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  insert into public.vortex_reports(category_id,description,urgency,address,neighborhood,reference_point,latitude,longitude,event_at,tracking_code_hash,tracking_pin_hash)
  values(v_category_id,btrim(p_description),v_urgency,nullif(btrim(p_address),''),nullif(btrim(p_neighborhood),''),nullif(btrim(p_reference_point),''),p_latitude,p_longitude,p_event_at,extensions.crypt(v_code,extensions.gen_salt('bf',12)),extensions.crypt(p_tracking_pin,extensions.gen_salt('bf',12))) returning * into v_report;
  protocol := v_report.protocol; tracking_code := v_code; status := v_report.status; created_at := v_report.created_at; return next;
exception when others then raise exception using errcode = 'P0001', message = 'Não foi possível registrar a denúncia.';
end; $$;

alter function public.vortex_submit_public_report(text,text,text,text,text,text,numeric,numeric,timestamptz,text) owner to postgres;
revoke all on function public.vortex_submit_public_report(text,text,text,text,text,text,numeric,numeric,timestamptz,text) from public, anon, authenticated;
grant execute on function public.vortex_submit_public_report(text,text,text,text,text,text,numeric,numeric,timestamptz,text) to anon, authenticated;
commit;
