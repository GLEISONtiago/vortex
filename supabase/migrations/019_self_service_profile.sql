-- Perfil de autoatendimento da equipe.
alter table public.vortex_profiles add column if not exists phone text null, add column if not exists functional_title text null;
alter table public.vortex_profiles drop constraint if exists vortex_profiles_phone_length_check;
alter table public.vortex_profiles add constraint vortex_profiles_phone_length_check check (phone is null or char_length(phone)<=30);
alter table public.vortex_profiles drop constraint if exists vortex_profiles_functional_title_length_check;
alter table public.vortex_profiles add constraint vortex_profiles_functional_title_length_check check (functional_title is null or char_length(functional_title)<=100);

create or replace function public.vortex_update_own_profile(p_full_name text,p_phone text default null,p_functional_title text default null)
returns void language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_uid uuid:=auth.uid();v_name text:=nullif(btrim(p_full_name),'');v_phone text:=nullif(btrim(coalesce(p_phone,'')),'');v_title text:=nullif(btrim(coalesce(p_functional_title,'')),'');
begin
 if v_uid is null then raise exception 'not authenticated';end if;
 if v_name is null or char_length(v_name)>150 then raise exception 'invalid name';end if;
 if v_phone is not null and char_length(v_phone)>30 then raise exception 'invalid phone';end if;
 if v_title is not null and char_length(v_title)>100 then raise exception 'invalid title';end if;
 update public.vortex_profiles set full_name=v_name,phone=v_phone,functional_title=v_title,updated_at=now() where id=v_uid and active=true;
 if not found then raise exception 'inactive profile';end if;
 insert into public.vortex_audit_log(actor_id,action,entity_type,entity_id,metadata) values(v_uid,'PROFILE_UPDATED','USER',v_uid,jsonb_build_object('self_service',true));
end;$$;
revoke all on function public.vortex_update_own_profile(text,text,text) from public,anon;
grant execute on function public.vortex_update_own_profile(text,text,text) to authenticated;
