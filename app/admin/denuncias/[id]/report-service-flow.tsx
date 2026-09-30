"use client";
import { useState,type ReactNode } from "react";

const labels=["Conferir denúncia","Encaminhamento","Andamento","Comunicação","Histórico"];

export function ReportServiceFlow({protocol,statusLabel,overview,routing,andamento,communication,history}:{protocol:string;statusLabel:string;overview:ReactNode;routing:ReactNode;andamento:ReactNode;communication:ReactNode;history:ReactNode}){
 const [step,setStep]=useState(0);
 const contents=[overview,routing,andamento,communication,history];
 return <div className="mx-auto max-w-5xl">
  <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
   <div><p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">ATENDIMENTO DA DENÚNCIA · {protocol}</p><h1 className="mt-2 text-3xl font-bold text-[#102b42]">Conduza o atendimento passo a passo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Confira as informações, faça o encaminhamento, atualize o andamento e mantenha o denunciante informado.</p></div>
   <span className="rounded-full bg-[#d8f1ed] px-3 py-1.5 text-sm font-bold text-[#0c766d]">{statusLabel}</span>
  </div>
  <Progress step={step}/>
  <div className="mt-8">
   <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[.14em] text-[#0c766d]">ETAPA {step+1} DE {labels.length}</p><h2 className="mt-1 text-2xl font-bold text-[#102b42]">{labels[step]}</h2></div></div>
   {contents[step]}
   <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
    <button type="button" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0} className="min-h-11 px-4 text-sm font-semibold text-slate-700 disabled:opacity-30">Voltar</button>
    {step<labels.length-1?<button type="button" onClick={()=>setStep(s=>Math.min(labels.length-1,s+1))} className="min-h-11 rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white">Continuar</button>:<button type="button" onClick={()=>setStep(0)} className="min-h-11 rounded-lg border border-[#0c766d] px-5 text-sm font-bold text-[#0c766d]">Voltar ao início do atendimento</button>}
   </div>
  </div>
 </div>;
}
function Progress({step}:{step:number}){return <ol className="mt-8 grid grid-cols-5 gap-1">{labels.map((label,index)=><li key={label}><div><div className={`h-1.5 rounded-full ${index<=step?"bg-[#0c766d]":"bg-slate-200"}`}/><span className={`mt-2 hidden text-xs sm:block ${index===step?"font-bold text-[#0c766d]":"text-slate-500"}`}>{index+1}. {label}</span></div></li>)}</ol>;}
