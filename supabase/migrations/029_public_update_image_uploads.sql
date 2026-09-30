alter table public.vortex_public_updates add column if not exists image_path text null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vortex-public-updates','vortex-public-updates',true,2097152,array['image/webp','image/jpeg','image/png']::text[])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Vortex admins upload public update images" on storage.objects;
create policy "Vortex admins upload public update images" on storage.objects for insert to authenticated
with check(bucket_id='vortex-public-updates' and public.vortex_is_admin());

drop policy if exists "Vortex admins update public update images" on storage.objects;
create policy "Vortex admins update public update images" on storage.objects for update to authenticated
using(bucket_id='vortex-public-updates' and public.vortex_is_admin())
with check(bucket_id='vortex-public-updates' and public.vortex_is_admin());

drop policy if exists "Vortex admins delete public update images" on storage.objects;
create policy "Vortex admins delete public update images" on storage.objects for delete to authenticated
using(bucket_id='vortex-public-updates' and public.vortex_is_admin());
