-- Hardening pré-lançamento: funções de trigger não devem ser RPCs públicas.
revoke all on function public.vortex_audit_report_created() from public, anon, authenticated;
revoke all on function public.vortex_audit_reporter_message() from public, anon, authenticated;
revoke all on function public.vortex_clear_waiting_on_reporter_reply() from public, anon, authenticated;
revoke all on function public.vortex_notify_assignment() from public, anon, authenticated;
revoke all on function public.vortex_notify_new_report() from public, anon, authenticated;

-- RPC legada sem upload não é utilizada pelo formulário atual.
revoke all on function public.vortex_submit_public_report(
  text,text,text,text,text,text,numeric,numeric,timestamptz,text
) from public, anon, authenticated;
