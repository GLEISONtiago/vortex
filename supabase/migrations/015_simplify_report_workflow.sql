-- Fluxo simplificado: Nova -> Em análise -> Em atendimento -> Finalizada.
alter type public.vortex_report_status add value if not exists 'FINALIZADA';

-- Após o novo valor do enum estar disponível:
alter table public.vortex_reports add column if not exists resolution text;
alter table public.vortex_reports add constraint vortex_reports_resolution_check check (resolution is null or resolution in ('PROCEDENTE','IMPROCEDENTE','RESOLVIDA','ENCAMINHADA_OUTRO_ORGAO','NAO_FOI_POSSIVEL_AVERIGUAR'));
-- Registros legados são migrados: IMPROCEDENTE/CONCLUIDA -> FINALIZADA; ENCAMINHADA -> EM_ATENDIMENTO.
