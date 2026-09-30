"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "../components/brand-mark";
import { FileText, Shield } from "../components/icons";
import { createClient } from "../../lib/supabase/client";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0c766d] focus:ring-2 focus:ring-[#0c766d]/15";

type PublicReport = {
  protocol: string;
  status: "NOVA" | "EM_ANALISE" | "EM_ATENDIMENTO" | "FINALIZADA";
  resolution?: string | null;
  created_at: string;
  messages: Array<{ id: string; sender_type: "STAFF"|"REPORTER"|"SYSTEM"; message: string; created_at: string }>;
};

const statusLabels: Record<PublicReport["status"], string> = {
  NOVA: "Nova",
  EM_ANALISE: "Em análise",
  EM_ATENDIMENTO: "Em atendimento",
  FINALIZADA: "Finalizada",
};

export function FollowUp() {
  const [protocol, setProtocol] = useState("");
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<PublicReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState("");

  const consult = async () => {
    if (!protocol.trim() || !/^[0-9]{6}$/.test(pin)) {
      setError("Informe o protocolo e o PIN numérico de 6 dígitos.");
      setResult(null);
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    const { data, error: rpcError } = await createClient().rpc("vortex_get_public_report_by_protocol_pin", {
      p_protocol: protocol.trim(),
      p_tracking_pin: pin,
    });

    setLoading(false);

    if (rpcError || !data?.[0]) {
      setError("Não foi possível localizar uma denúncia com esses dados.");
      return;
    }

    setResult(data[0] as PublicReport);
  };

  const refreshMessages = async () => { if (!result) return; const refreshed=await createClient().rpc("vortex_get_public_report_by_protocol_pin",{p_protocol:protocol.trim(),p_tracking_pin:pin}); if(refreshed.data?.[0]) setResult(refreshed.data[0] as PublicReport); };
  const sendReply = async () => {
    if (!result || reply.trim().length < 2) return;
    setSending(true); setMessageError("");
    const supabase=createClient();
    const {data,error:rpcError}=await supabase.rpc("vortex_send_public_report_message",{p_protocol:protocol.trim(),p_tracking_pin:pin,p_message:reply.trim()});
    if(rpcError||!data){setMessageError("Não foi possível enviar a mensagem. Tente novamente.");setSending(false);return;}
    setReply("");
    const refreshed=await supabase.rpc("vortex_get_public_report_by_protocol_pin",{p_protocol:protocol.trim(),p_tracking_pin:pin});
    if(refreshed.data?.[0]) setResult(refreshed.data[0] as PublicReport);
    setSending(false);
  };

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#102b42]">
      <header className="bg-[#092940]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <BrandMark />
          <Link href="/" className="text-sm font-semibold text-slate-200 hover:text-white">Voltar ao início</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">CONSULTA DE DENÚNCIA</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Acompanhe seu registro</h1>
          <p className="mt-3 leading-7 text-slate-600">Informe o protocolo e o PIN definidos ao concluir a denúncia.</p>
        </div>
        <div className="mt-8 grid gap-7 lg:grid-cols-[.85fr_1.15fr]">
          <form onSubmit={(event) => { event.preventDefault(); void consult(); }} className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <label htmlFor="protocol" className="text-sm font-semibold text-slate-700">Protocolo</label>
              <input id="protocol" value={protocol} onChange={(event) => setProtocol(event.target.value)} className={fieldClass} placeholder="Ex.: VTX-2026-8F4D" autoComplete="off" />
            </div>
            <div className="mt-5">
              <label htmlFor="pin" className="text-sm font-semibold text-slate-700">PIN de acompanhamento</label>
              <input id="pin" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} className={fieldClass} placeholder="6 dígitos" autoComplete="off" />
            </div>
            {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <button type="submit" disabled={loading} className="mt-6 min-h-11 w-full rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white hover:bg-[#095f58] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Consultando..." : "Consultar"}</button>
            <p className="mt-4 flex gap-2 text-xs leading-5 text-slate-500"><Shield /> O PIN protege o acesso ao acompanhamento da sua denúncia.</p>
          </form>
          <div>{result ? <Result report={result} reply={reply} setReply={setReply} sending={sending} sendReply={sendReply} refreshMessages={refreshMessages} messageError={messageError} /> : <EmptyState />}</div>
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center"><span className="grid size-12 place-items-center rounded-full bg-[#d8f1ed] text-[#0c766d]"><FileText /></span><h2 className="mt-4 text-lg font-bold">Aguardando consulta</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">As informações permitidas aparecerão aqui após uma consulta válida.</p></section>;
}

function Result({ report, reply, setReply, sending, sendReply, refreshMessages, messageError }: { report: PublicReport; reply:string; setReply:(v:string)=>void; sending:boolean; sendReply:()=>void; refreshMessages:()=>void; messageError:string }) {
 const createdAt=new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(report.created_at));
 const resolutionLabels:Record<string,string>={PROCEDENTE:"Procedente",IMPROCEDENTE:"Improcedente",RESOLVIDA:"Resolvida",ENCAMINHADA_OUTRO_ORGAO:"Encaminhada a outro órgão",NAO_FOI_POSSIVEL_AVERIGUAR:"Não foi possível averiguar"};
 const steps=["NOVA","EM_ANALISE","EM_ATENDIMENTO","FINALIZADA"]; const current=Math.max(0,steps.indexOf(report.status));
 const chatEnd=useRef<HTMLDivElement>(null);
 useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[report.messages?.length]);
 return <section className="rounded-2xl border border-[#0c766d]/25 bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-bold tracking-[.14em] text-[#0c766d]">ACOMPANHAMENTO DA DENÚNCIA</p><h2 className="mt-2 text-xl font-bold">Registro {report.protocol}</h2>
 <div className="mt-6 grid grid-cols-4 gap-2">{steps.map((s,i)=><div key={s} className="text-center"><div className={`mx-auto size-3 rounded-full ${i<=current?"bg-[#0c766d]":"bg-slate-200"}`}/><div className={`mt-2 h-1 rounded ${i<=current?"bg-[#0c766d]":"bg-slate-200"}`}/><p className="mt-2 text-[11px] font-semibold text-slate-600">{statusLabels[s as PublicReport["status"]]}</p></div>)}</div>
 <dl className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><dt className="text-xs font-bold text-slate-500">STATUS ATUAL</dt><dd className="mt-1 font-bold text-[#0c766d]">{statusLabels[report.status]}</dd></div><div><dt className="text-xs font-bold text-slate-500">REGISTRADA EM</dt><dd className="mt-1 font-semibold text-slate-700">{createdAt}</dd></div>{report.status==="FINALIZADA"&&report.resolution&&<div className="sm:col-span-2"><dt className="text-xs font-bold text-slate-500">RESULTADO</dt><dd className="mt-1 font-semibold">{resolutionLabels[report.resolution]||report.resolution}</dd></div>}</dl>
 <div className="mt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Conversa com a equipe</h3><p className="mt-1 text-xs text-slate-500">Use este espaço para complementar informações sobre a denúncia.</p></div><button type="button" onClick={refreshMessages} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600">Atualizar</button></div>
 <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">{report.messages?.length?<div className="grid gap-3">{report.messages.map(m=><div key={m.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${m.sender_type==="REPORTER"?"ml-auto rounded-br-sm bg-[#d8f1ed]":"mr-auto rounded-bl-sm bg-white ring-1 ring-slate-200"}`}><p className="text-[11px] font-bold text-slate-500">{m.sender_type==="REPORTER"?"Você":m.sender_type==="STAFF"?"Equipe Vórtex":"Sistema"}</p><p className="mt-1 whitespace-pre-wrap leading-5">{m.message}</p><p className="mt-2 text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString("pt-BR")}</p></div>)}<div ref={chatEnd}/></div>:<p className="py-8 text-center text-sm text-slate-500">Ainda não há mensagens. Você pode iniciar a conversa abaixo.</p>}</div></div>
 <div className="mt-4 rounded-xl border border-slate-200 p-3"><label className="text-sm font-bold">Nova mensagem</label><textarea value={reply} onChange={e=>setReply(e.target.value)} maxLength={2000} rows={3} className={fieldClass} placeholder="Digite uma nova informação para a equipe..." />{messageError&&<p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{messageError}</p>}<div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{reply.length}/2000</span><button type="button" onClick={sendReply} disabled={sending||reply.trim().length<2} className="rounded-lg bg-[#102b42] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{sending?"Enviando...":"Enviar"}</button></div></div>
 </section>;
}
