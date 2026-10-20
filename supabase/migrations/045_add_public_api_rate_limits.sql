create table if not exists public.vortex_public_rate_limits (
 rate_key text not null,
 window_start timestamptz not null,
 request_count integer not null default 1 check (request_count>0),
 primary key(rate_key,window_start)
);
alter table public.vortex_public_rate_limits enable row level security;
revoke all on table public.vortex_public_rate_limits from public,anon,authenticated;

create or replace function public.vortex_consume_public_rate_limit(p_rate_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path to 'pg_catalog','pg_temp' as $$
declare v_window timestamptz; v_count integer;
begin
 if length(coalesce(p_rate_key,'')) not between 8 and 160 or p_limit not between 1 and 10000 or p_window_seconds not between 10 and 86400 then raise exception 'invalid rate limit parameters'; end if;
 v_window:=to_timestamp(floor(extract(epoch from clock_timestamp())/p_window_seconds)*p_window_seconds);
 insert into public.vortex_public_rate_limits(rate_key,window_start,request_count) values(p_rate_key,v_window,1)
 on conflict(rate_key,window_start) do update set request_count=public.vortex_public_rate_limits.request_count+1
 returning request_count into v_count;
 return v_count<=p_limit;
end; $$;
revoke all on function public.vortex_consume_public_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.vortex_consume_public_rate_limit(text,integer,integer) to service_role;
