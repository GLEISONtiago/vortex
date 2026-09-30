-- Coordenadores precisam manter visibilidade das denúncias após atribuí-las.
-- ADMIN e COORDENADOR visualizam toda a fila; OPERADOR somente denúncias ativamente atribuídas a ele.
create or replace function public.vortex_can_view_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'pg_temp'
as $$
  select exists (
    select 1
    from public.vortex_profiles p
    where p.id = (select auth.uid())
      and p.active = true
      and (
        p.role::text in ('ADMIN', 'COORDENADOR')
        or (
          p.role::text = 'OPERADOR'
          and exists (
            select 1
            from public.vortex_report_assignments a
            where a.report_id = p_report_id
              and a.assigned_to = p.id
              and a.ended_at is null
          )
        )
      )
  );
$$;
revoke all on function public.vortex_can_view_report(uuid) from public;
grant execute on function public.vortex_can_view_report(uuid) to authenticated;
