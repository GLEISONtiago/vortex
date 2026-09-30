alter table public.vortex_public_updates add column if not exists content text, add column if not exists image_position_x double precision not null default 50, add column if not exists image_position_y double precision not null default 50;
alter table public.vortex_public_updates drop constraint if exists vortex_public_updates_image_position_check;
alter table public.vortex_public_updates add constraint vortex_public_updates_image_position_check check (image_position_x between 0 and 100 and image_position_y between 0 and 100);
update public.vortex_public_updates set content=summary where content is null;
