-- Simplifica os perfis operacionais para ADMIN, COORDENADOR e OPERADOR.
-- Os valores antigos do enum são mantidos apenas por compatibilidade histórica.
alter type public.vortex_staff_role add value if not exists 'OPERADOR';

-- Executar em transação separada após o ALTER TYPE quando necessário:
-- update public.vortex_profiles set role='OPERADOR' where role::text in ('AGENTE','ANALISTA');
