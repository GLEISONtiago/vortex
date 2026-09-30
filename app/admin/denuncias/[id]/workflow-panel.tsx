"use client";
import { useMemo,useState,useTransition } from "react";
import { addInternalNote, sendReporterMessage, updateReportStatus } from "./workflow-actions";
import { statusLabel } from "../../presentation";

const statuses = ["NOVA","EM_ANALISE","EM_ATENDIMENTO"];
const noteSuggestions:Record<string,string[]>={
 NOVA:["Denúncia recebida e registrada para análise preliminar."],
 EM_ANALISE:["Denúncia em análise pela equipe responsável.","Informações recebidas estão sendo verificadas para definição das providências cabíveis."],
 EM_ATENDIMENTO:["Denúncia encaminhada para atendimento da equipe responsável.","Equipe responsável acionada para averiguação dos fatos informados."]
};
const serviceNotes=[
 "Equipe acionada para averiguação no local informado.",
 "Local averiguado pela equipe responsável.",
 "Não foi possível localizar a situação no endereço informado.",
 "Orientação realizada no local.",
 "Informações conferidas e registradas para continuidade do atendimento.",
 "Situação encaminhada para apoio de outro serviço ou órgão competente."
];

export function WorkflowPanel({
 reportId,currentStatus,canUpdateStatus=true,unitName,mode="status",contextSuggestions=[],awaitingReporterInfo=false,latestReporterReply=false
}:{
 reportId:string;currentStatus:string;canUpdateStatus?:boolean;unitName?:string|null;mode?:"status"|"message";
 contextSuggestions?:string[];awaitingReporterInfo?:boolean;latestReporterReply?:boolean;
}){
 const [status,setStatus]=useState(currentStatus==="FINALIZADA"?"EM_ATENDIMENTO":currentStatus);
 const [note,setNote]=useState("");
 const [internal,setInternal]=useState("");
 const [message,setMessage]=useState("");
 const [waitForReply,setWaitForReply]=useState(awaitingReporterInfo);
 const [feedback,setFeedback]=useState("");
 const [pending,startTransition]=useTransition();
 const run=(fn:()=>Promise<{error?:string;message?:string}>)=>startTransition(async()=>{setFeedback("");const r=await fn();setFeedback(r.error||r.message||"");});
 const messageSuggestions=useMemo(()=>[
   {label:"Recebida",text:"Recebemos sua denúncia. Ela foi registrada e seguirá para análise da equipe responsável.",wait:false},
   {label:"Encaminhada",text:`Sua denúncia foi encaminhada para ${unitName?`o grupamento ${unitName}`:"a equipe responsável"} e seguirá o fluxo de atendimento.`,wait:false},
   {label:"Solicitar complementos",text:contextSuggestions[0]||"Para dar continuidade à análise, precisamos de informações complementares. Se possível, envie mais detalhes sobre o fato, o local e o horário aproximado.",wait:true},
   {label:"Em atendimento",text:"Sua denúncia está em atendimento pela equipe responsável. Novas informações poderão ser registradas por este canal de acompanhamento.",wait:false}
 ],[unitName,contextSuggestions]);

 if(mode==="message")return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-[#102b42]">Dar retorno ao denunciante</h3><p className="mt-1 text-sm leading-6 text-slate-500">Escolha uma sugestão ou escreva uma mensagem. O texto só é enviado depois da sua confirmação.</p></div>{latestReporterReply&&<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">Nova resposta do denunciante</span>}</div>
  {awaitingReporterInfo&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Esta denúncia está marcada como aguardando complemento do denunciante.</p>}
  {contextSuggestions.length>0&&<div className="mt-4 rounded-xl border border-[#0c766d]/20 bg-[#eef9f7] p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[#0c766d]">Sugestão do VÓRTEX</p><p className="mt-2 text-sm leading-6 text-slate-700">{contextSuggestions[0]}</p><button type="button" onClick={()=>{setMessage(contextSuggestions[0]);setWaitForReply(true);}} className="mt-3 text-sm font-bold text-[#0c766d] underline underline-offset-4">Usar sugestão</button></div>}
  <SuggestionRow title="Modelos rápidos" suggestions={messageSuggestions.map(x=>x.text)} labels={messageSuggestions.map(x=>x.label)} onPick={(text,index)=>{setMessage(text);setWaitForReply(messageSuggestions[index]?.wait||false);}}/>
  <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={7} maxLength={2000} placeholder="Escreva a mensagem ou escolha uma sugestão acima..." className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm"/>
  <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" checked={waitForReply} onChange={e=>setWaitForReply(e.target.checked)} className="mt-0.5 size-4 accent-[#0c766d]"/><span><b>Marcar como aguardando complemento</b><span className="mt-0.5 block text-xs leading-5 text-slate-500">Use quando a continuidade depender de uma resposta do denunciante. A marcação é retirada automaticamente quando ele responder.</span></span></label>
  <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{message.length}/2000</span><button disabled={pending||message.trim().length<2} onClick={()=>run(async()=>{const r=await sendReporterMessage(reportId,message,waitForReply);if(!r.error)setMessage("");return r;})} className="rounded-lg bg-[#102b42] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{pending?"Enviando...":"Enviar mensagem"}</button></div>
  {feedback&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{feedback}</p>}
 </section>;

 return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-[#102b42]">Registrar o atendimento</h3><p className="mt-1 text-sm leading-6 text-slate-500">Atualize o andamento e registre o que foi efetivamente realizado pela equipe.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{statusLabel(currentStatus)}</span></div>
  {currentStatus==="FINALIZADA"?<p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Esta denúncia já foi finalizada. Consulte o histórico abaixo para revisar as providências registradas.</p>:<>
   {canUpdateStatus?<div className="mt-5 grid gap-3"><label className="text-sm font-semibold text-slate-700">Andamento<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm">{statuses.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><SuggestionRow title="Sugestões para a alteração" suggestions={noteSuggestions[status]||[]} onPick={(text)=>setNote(text)}/><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Observação sobre a alteração (opcional)" className="rounded-lg border border-slate-300 p-3 text-sm"/><button disabled={pending||status===currentStatus} onClick={()=>run(()=>updateReportStatus(reportId,status,note))} className="min-h-11 rounded-lg bg-[#0c766d] px-4 text-sm font-bold text-white disabled:opacity-50">Atualizar andamento</button></div>:<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Seu perfil acompanha esta etapa, mas não executa a alteração operacional de status.</p>}
   <div className="mt-6 border-t border-slate-200 pt-5"><p className="text-sm font-bold text-slate-800">O que foi feito?</p><p className="mt-1 text-xs leading-5 text-slate-500">Use uma ação rápida como ponto de partida e ajuste o texto se necessário.</p><SuggestionRow title="Ações rápidas" suggestions={serviceNotes} labels={["Equipe acionada","Local averiguado","Não localizado","Orientação realizada","Informações conferidas","Outro órgão"]} onPick={(text)=>setInternal(text)}/><textarea value={internal} onChange={e=>setInternal(e.target.value)} rows={4} maxLength={1500} placeholder="Descreva a providência realizada..." className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm"/><button disabled={pending||internal.trim().length<3} onClick={()=>run(async()=>{const r=await addInternalNote(reportId,internal);if(!r.error)setInternal("");return r;})} className="mt-2 rounded-lg border border-[#0c766d] px-4 py-2.5 text-sm font-bold text-[#0c766d] disabled:opacity-50">Registrar providência</button></div>
  </>}
  {feedback&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{feedback}</p>}
 </section>;
}

function SuggestionRow({title,suggestions,labels,onPick}:{title:string;suggestions:string[];labels?:string[];onPick:(value:string,index:number)=>void}){
 if(!suggestions.length)return null;
 return <div className="mt-4 rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p><div className="mt-2 flex flex-wrap gap-2">{suggestions.map((text,index)=><button key={text} type="button" onClick={()=>onPick(text,index)} title={text} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0c766d] transition hover:border-[#0c766d] hover:bg-[#eef9f7]">{labels?.[index]||`Sugestão ${index+1}`}</button>)}</div></div>;
}
