import type { ReactNode } from "react";

type Stage="TRIAGE"|"WAITING_ASSIGNMENT"|"ASSIGNMENT"|"HANDLING"|"FINALIZED";

const stages=["Triagem","Atribuição","Atendimento","Finalização"];

export function ReportServiceFlow({
 protocol,statusLabel,stage,overview,routing,handling,communication,finalization,history,alerts=[],unitName
}:{
 protocol:string;statusLabel:string;stage:Stage;overview:ReactNode;routing:ReactNode;handling:ReactNode;communication:ReactNode;finalization:ReactNode;history:ReactNode;alerts?:string[];unitName?:string|null;
}){
 const currentIndex=stage==="TRIAGE"?0:stage==="WAITING_ASSIGNMENT"||stage==="ASSIGNMENT"?1:stage==="HANDLING"?2:3;
 return <div className="mx-auto max-w-5xl">
  <section className="mt-5 overflow-hidden border border-[#173b57] bg-[#0b2a43] text-white shadow-sm">
   <div className="border-l-4 border-[#e7b548] px-5 py-5 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
     <div><p className="text-[10px] font-black tracking-[.2em] text-[#74d5c9]">GCMJP · CENTRAL OPERACIONAL</p><p className="mt-2 text-xs font-bold tracking-[.15em] text-slate-300">PROTOCOLO {protocol}</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Atendimento da denúncia</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">O VÓRTEX mostra somente a ação necessária para a etapa atual. As demais informações continuam disponíveis para consulta.</p></div>
     <span className="rounded-md bg-[#0c766d] px-3 py-1.5 text-sm font-black text-white ring-1 ring-white/15">{statusLabel}</span>
    </div>
   </div>
  </section>

  {alerts.length>0&&<div className="mt-5 grid gap-2">{alerts.map(alert=><p key={alert} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{alert}</p>)}</div>}

  <ol className="mt-6 grid grid-cols-4 gap-1">{stages.map((label,index)=><li key={label}><div className={`h-1.5 rounded-full ${index<currentIndex||stage==="FINALIZED"?"bg-emerald-500":index===currentIndex?"bg-[#0c766d]":"bg-slate-200"}`}/><span className={`mt-2 hidden text-xs sm:block ${index===currentIndex?"font-bold text-[#0c766d]":"text-slate-500"}`}>{index<currentIndex||stage==="FINALIZED"?"✓ ":""}{label}</span></li>)}</ol>

  {stage==="TRIAGE"&&<main className="mt-8">
   <SectionTitle eyebrow="1 · CONFERIR" title="Revise os dados e encaminhe"/>
   {overview}
   <div className="mt-6"><SectionTitle eyebrow="PRÓXIMA AÇÃO" title="Classificar e encaminhar"/>{routing}</div>
  </main>}

  {stage==="WAITING_ASSIGNMENT"&&<main className="mt-8">
   <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[.14em] text-emerald-700">Triagem concluída</p><h2 className="mt-2 text-xl font-black text-emerald-950">Encaminhamento realizado</h2><p className="mt-2 text-sm leading-6 text-emerald-900">A denúncia foi encaminhada{unitName?<> para <b>{unitName}</b></>:null} e agora aguarda a chefia/coordenação atribuir um responsável. Nenhuma outra ação da triagem é necessária neste momento.</p></section>
   <div className="mt-5 flex flex-wrap gap-3"><a href="/admin/triagem" className="rounded-lg bg-[#0c766d] px-5 py-3 text-sm font-bold text-white">Voltar para a triagem</a><a href="/admin/denuncias" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700">Ver denúncias</a></div>
   <details className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="cursor-pointer px-5 py-4 font-bold text-[#102b42] sm:px-6">Alterar classificação ou grupamento</summary><div className="border-t border-slate-200 p-5 sm:p-6">{routing}</div></details>
  </main>}

  {stage==="ASSIGNMENT"&&<main className="mt-8"><SectionTitle eyebrow="PRÓXIMA AÇÃO" title="Atribuir responsável"/>{routing}</main>}

  {stage==="HANDLING"&&<main className="mt-8">
   <SectionTitle eyebrow="ETAPA ATUAL" title="Atendimento"/>
   {handling}
   <div className="mt-6"><SectionTitle eyebrow="QUANDO NECESSÁRIO" title="Comunicação com o denunciante"/>{communication}</div>
   <div className="mt-6"><SectionTitle eyebrow="AO CONCLUIR" title="Finalização"/>{finalization}</div>
  </main>}

  {stage==="FINALIZED"&&<main className="mt-8"><SectionTitle eyebrow="ATENDIMENTO ENCERRADO" title="Finalização"/>{finalization}</main>}

  {stage!=="TRIAGE"&&<details className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="cursor-pointer px-5 py-4 font-bold text-[#102b42] sm:px-6">Dados completos da denúncia</summary><div className="border-t border-slate-200 p-5 sm:p-6">{overview}</div></details>}
  <details id="historico-atendimento" className="mt-5 scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="cursor-pointer px-5 py-4 font-bold text-[#102b42] sm:px-6">Histórico, providências e comunicações</summary><div className="border-t border-slate-200 p-5 sm:p-6">{history}</div></details>
 </div>;
}

function SectionTitle({eyebrow,title}:{eyebrow:string;title:string}){return <div className="mb-4 border-l-4 border-[#0c766d] pl-4"><p className="text-[10px] font-black tracking-[.16em] text-slate-500">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-[#102b42]">{title}</h2></div>;}
