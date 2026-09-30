"use client";
import { useEffect,useState,type ReactNode } from "react";

const labels=["Conferir","Encaminhar","Atender","Comunicar","Finalizar"];

export function ReportServiceFlow({
 protocol,statusLabel,overview,routing,handling,communication,finalization,history,initialStep=0,completed=[false,false,false,false,false],alerts=[]
}:{
 protocol:string;statusLabel:string;overview:ReactNode;routing:ReactNode;handling:ReactNode;communication:ReactNode;finalization:ReactNode;history:ReactNode;
 initialStep?:number;completed?:boolean[];alerts?:string[];
}){
 const [step,setStep]=useState(initialStep);
 useEffect(()=>setStep(initialStep),[initialStep]);
 const contents=[overview,routing,handling,communication,finalization];
 const goHistory=()=>document.getElementById("historico-atendimento")?.scrollIntoView({behavior:"smooth",block:"start"});
 return <div className="mx-auto max-w-5xl">
  <section className="mt-5 overflow-hidden border border-[#173b57] bg-[#0b2a43] text-white shadow-sm">
   <div className="border-l-4 border-[#e7b548] px-5 py-5 sm:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
     <div><p className="text-[10px] font-black tracking-[.2em] text-[#74d5c9]">GCMJP · CENTRAL OPERACIONAL</p><p className="mt-2 text-xs font-bold tracking-[.15em] text-slate-300">PROTOCOLO {protocol}</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Fluxo operacional da denúncia</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Conferência, encaminhamento, atendimento, comunicação e encerramento em uma única sequência operacional.</p></div>
     <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#0c766d] px-3 py-1.5 text-sm font-black text-white ring-1 ring-white/15">{statusLabel}</span><button type="button" onClick={goHistory} className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Histórico</button></div>
    </div>
   </div>
  </section>
  {alerts.length>0&&<div className="mt-5 grid gap-2">{alerts.map(alert=><p key={alert} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{alert}</p>)}</div>}
  <Progress step={step} completed={completed}/>
  <div className="mt-8">
   <div className="mb-4 border-l-4 border-[#0c766d] pl-4"><p className="text-[10px] font-black tracking-[.16em] text-slate-500">ETAPA OPERACIONAL {step+1} DE {labels.length}</p><h2 className="mt-1 text-2xl font-black text-[#102b42]">{labels[step]}</h2></div>
   {contents[step]}
   <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
    <button type="button" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} className="min-h-11 px-4 text-sm font-semibold text-slate-700 disabled:opacity-30">Voltar</button>
    {step<labels.length-1?<button type="button" onClick={()=>setStep(s=>Math.min(labels.length-1,s+1))} className="min-h-11 rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white">Continuar</button>:<button type="button" onClick={()=>setStep(0)} className="min-h-11 rounded-lg border border-[#0c766d] px-5 text-sm font-bold text-[#0c766d]">Revisar atendimento</button>}
   </div>
  </div>
  <details id="historico-atendimento" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm">
   <summary className="cursor-pointer list-none px-5 py-4 font-bold text-[#102b42] marker:content-none sm:px-6">Histórico, providências e comunicações <span className="ml-2 text-sm font-normal text-slate-500">— disponível em qualquer etapa</span></summary>
   <div className="border-t border-slate-200 p-5 sm:p-6">{history}</div>
  </details>
 </div>;
}

function Progress({step,completed}:{step:number;completed:boolean[]}){
 return <ol className="mt-8 grid grid-cols-5 gap-1">{labels.map((label,index)=><li key={label}><div className={`h-1.5 rounded-full ${completed[index]?"bg-emerald-500":index<=step?"bg-[#0c766d]":"bg-slate-200"}`}/><span className={`mt-2 hidden items-center gap-1 text-xs sm:flex ${index===step?"font-bold text-[#0c766d]":"text-slate-500"}`}>{completed[index]&&<b className="text-emerald-600">✓</b>}{index+1}. {label}</span></li>)}</ol>;
}
