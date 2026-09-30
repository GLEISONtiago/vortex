-- Publicações institucionais e métricas agregadas da página inicial.
-- Aplicada em produção como public_home_updates_and_metrics.
create table if not exists public.vortex_public_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 10 and 600),
  location text null check (location is null or char_length(location) <= 160),
  image_url text null check (image_url is null or char_length(image_url) <= 1200),
  occurred_at timestamptz not null default now(),
  published boolean not null default false,
  created_by uuid null references public.vortex_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vortex_public_updates enable row level security;
revoke all on public.vortex_public_updates from anon, authenticated;
grant select, insert, update, delete on public.vortex_public_updates to service_role;

create or replace function public.vortex_public_metrics()
returns table(total_reports bigint, finalized_reports bigint, categories jsonb)
language sql stable security definer set search_path=public
as $$
with counts as (
  select c.id,c.name,count(r.id)::bigint report_count
  from public.vortex_categories c
  left join public.vortex_reports r on r.category_id=c.id
  where c.active=true group by c.id,c.name
), totals as (
  select count(*)::bigint total_reports,
         count(*) filter(where status='FINALIZADA')::bigint finalized_reports
  from public.vortex_reports
)
select t.total_reports,t.finalized_reports,
coalesce((select jsonb_agg(jsonb_build_object('name',name,'count',report_count) order by report_count desc,name)
          from counts where report_count>0),'[]'::jsonb)
from totals t;
$$;
revoke all on function public.vortex_public_metrics() from public,anon,authenticated;
grant execute on function public.vortex_public_metrics() to service_role;
create index if not exists vortex_public_updates_published_idx on public.vortex_public_updates(published,occurred_at desc);
