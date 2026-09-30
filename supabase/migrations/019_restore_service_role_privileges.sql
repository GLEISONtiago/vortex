-- Restaura os privilégios explícitos do service_role usados pelas rotas administrativas server-side.
-- O service_role continua restrito ao servidor e bypassa RLS conforme o modelo do Supabase.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
