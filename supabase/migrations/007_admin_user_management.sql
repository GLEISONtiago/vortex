begin;

create table public.vortex_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index vortex_audit_log_entity_idx on public.vortex_audit_log(entity_type, entity_id, created_at desc);
create index vortex_audit_log_actor_idx on public.vortex_audit_log(actor_id, created_at desc);

alter table public.vortex_audit_log enable row level security;
revoke all on public.vortex_audit_log from anon, authenticated;

drop policy if exists "Staff can view their own Vórtex profile" on public.vortex_profiles;
drop policy if exists "Assignment managers view active staff" on public.vortex_profiles;
drop policy if exists "Admins can update Vórtex profiles" on public.vortex_profiles;

create policy "Active staff view own profile and admins manage visibility"
on public.vortex_profiles for select to authenticated
using ((id = auth.uid() and active = true) or public.vortex_is_admin());

create policy "Assignment managers view active staff"
on public.vortex_profiles for select to authenticated
using (active = true and public.vortex_can_list_assignment_profiles());

create policy "Admins update Vórtex profiles"
on public.vortex_profiles for update to authenticated
using (public.vortex_is_admin())
with check (public.vortex_is_admin());

commit;
