-- Operações públicas passam exclusivamente pelas rotas server-side do VÓRTEX.
grant execute on function public.vortex_get_public_report_by_protocol_pin(text,text) to service_role;
grant execute on function public.vortex_send_public_report_message(text,text,text) to service_role;
grant execute on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text) to service_role;
grant execute on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text,text,text,text) to service_role;

revoke execute on function public.vortex_get_public_report_by_protocol_pin(text,text) from anon, authenticated;
revoke execute on function public.vortex_send_public_report_message(text,text,text) from anon, authenticated;
revoke execute on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text) from anon, authenticated;
revoke execute on function public.vortex_submit_public_report_with_upload(text,text,text,text,text,text,numeric,numeric,timestamptz,text,text,text,text) from anon, authenticated;
