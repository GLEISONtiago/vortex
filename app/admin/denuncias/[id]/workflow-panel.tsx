"use client";
import { useMemo,useState,useTransition } from "react";
import { addInternalNote, sendReporterMessage, updateReportStatus } from "./workflow-actions";
import { statusLabel } from "../../presentation";

const statuses = ["NOVA","EM_ANALISE","EM_ATENDIMENTO","FINALIZADA"];
const resolutions = [["PROCEDENTE","Procedente"],["IMPROCEDENTE","Improcedente"],["RESOLVIDA","Resolvida"],["ENCAMINHADA_OUTRO_ORGAO","Encaminhada a outro órgão"],["NAO_FOI_POSSIVEL_AVERIGUAR","Não foi possível averiguar"]];

const noteSuggestions:Record<string,string[]>={
 NOVA:["Denúncia recebida e registrada para análise preliminar."],
 EM_ANALISE:["Denúncia em análise pela equipe responsável.","Informações recebidas estão sendo verificadas para definição das providências cabíveis."],
 EM_ATENDIMENTO:["Denúncia encaminhada para atendimento da equipe responsável.","Equipe responsável acionada para averiguação dos fatos informados."],
 FINALIZADA:["Atendimento concluído. Resultado registrado conforme apuração realizada.","Providências adotadas e atendimento encerrado conforme registro no histórico."]
};

export function WorkflowPanel({ reportId, currentStatus, canUpdateStatus=true, unitName, mode="all" }: { reportId: string; currentStatus: string; canUpdateStatus?: boolean; unitName?:string|null; mode?:"all"|"status"|"message" }) {
  const [status,setStatus]=useState(currentStatus); const [resolution,setResolution]=useState(""); const [note,setNote]=useState(""); const [internal,setInternal]=useState(""); const [message,setMessage]=useState(""); const [feedback,setFeedback]=useState(""); const [pending,startTransition]=useTransition();
  const run=(fn:()=>Promise<{error?:string;message?:string}>)=>startTransition(async()=>{setFeedback("");const r=await fn();setFeedback(r.error||r.message||"");});
  const messageSuggestions=useMemo(()=>[
   {label:"Recebida",text:"Recebemos sua denúncia. Ela foi registrada e seguirá para análise da equipe responsável."},
   {label:"Encaminhada",text:`Sua denúncia foi encaminhada para ${unitName?`o grupamento ${unitName}`:"a equipe responsável"} e seguirá o fluxo de atendimento.`},
   {label:"Solicitar complementos",text:"Para dar continuidade à análise, precisamos de informações complementares. Se possível, envie mais detalhes sobre o fato, como local exato, horário aproximado, características das pessoas ou veículos envolvidos e outras informações que possam auxiliar a averiguação."},
   {label:"Pedir local/detalhes",text:"Precisamos de mais detalhes para localizar e averiguar a situação. Se possível, informe o endereço ou ponto de referência, data e horário aproximados e descreva com mais detalhes o que ocorreu."},
   {label:"Em atendimento",text:"Sua denúncia está em atendimento pela equipe responsável. Novas informações poderão ser registradas por este canal de acompanhamento."},
   {label:"Finalizada",text:"O atendimento da sua denúncia foi finalizado. Consulte o andamento e o resultado registrado neste protocolo."}
  ],[unitName]);

  return <div className={mode==="all"?"grid gap-5 xl:grid-cols-2":"grid gap-5"}>
    {mode!=="message"&&<section id="andamento" className="scroll-mt-24 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {!canUpdateStatus&&<div><h2 className="font-bold">Acompanhamento interno</h2><p className="mt-1 text-sm text-slate-500">Seu perfil não executa a mudança operacional de status, mas pode registrar informações internas de análise.</p></div>}{canUpdateStatus&&<><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Atualizar andamento</h2><p className="mt-1 text-sm text-slate-500">Altere o status conforme a providência realmente adotada.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{statusLabel(currentStatus)}</span></div><div className="mt-4 grid gap-3"><select value={status} onChange={e=>{setStatus(e.target.value);setResolution("");}} className="rounded-lg border border-slate-300 p-3 text-sm">{statuses.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select>{status==="FINALIZADA" && <label className="text-sm font-semibold text-slate-700">Resultado da finalização<select value={resolution} onChange={e=>setResolution(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"><option value="">Selecione o resultado</option>{resolutions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
      <SuggestionRow title="Sugestões para a observação" suggestions={noteSuggestions[status]||[]} onPick={setNote}/>
      <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Observação sobre a alteração (opcional)" className="rounded-lg border border-slate-300 p-3 text-sm" /><button disabled={pending||status===currentStatus||(status==="FINALIZADA"&&!resolution)} onClick={()=>run(()=>updateReportStatus(reportId,status,note,resolution))} className="min-h-11 rounded-lg bg-[#0c766d] px-4 text-sm font-bold text-white disabled:opacity-50">Atualizar status</button></div></>}
      <div className={canUpdateStatus?"mt-6 border-t pt-5":""}><p className="text-sm font-bold">Observação interna</p><p className="mt-1 text-xs leading-5 text-slate-500">Registre informações de análise ou apoio operacional sem alterar o andamento da denúncia.</p><textarea value={internal} onChange={e=>setInternal(e.target.value)} rows={3} maxLength={1500} placeholder="Registre uma informação no histórico interno..." className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm" /><button disabled={pending||internal.trim().length<3} onClick={()=>run(async()=>{const r=await addInternalNote(reportId,internal);if(!r.error)setInternal("");return r;})} className="mt-2 rounded-lg border border-[#0c766d] px-4 py-2.5 text-sm font-bold text-[#0c766d] disabled:opacity-50">Registrar observação</button></div>{feedback&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{feedback}</p>}
    </section>}
    {mode!=="status"&&<section id="comunicacao" className="scroll-mt-24 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="font-bold">Dar retorno ao denunciante</h2><p className="mt-1 text-sm text-slate-500">A mensagem ficará disponível no acompanhamento pelo protocolo. Revise o texto antes de enviar.</p>
      <SuggestionRow title="Sugestões de mensagem" suggestions={messageSuggestions.map(x=>x.text)} labels={messageSuggestions.map(x=>x.label)} onPick={setMessage}/>
      <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={7} maxLength={2000} placeholder="Escreva a mensagem ou escolha uma sugestão acima..." className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{message.length}/2000</span><button disabled={pending||message.trim().length<2} onClick={()=>run(async()=>{const r=await sendReporterMessage(reportId,message);if(!r.error)setMessage("");return r;})} className="rounded-lg bg-[#102b42] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Enviar mensagem</button></div></section>}
  </div>;
}

function SuggestionRow({title,suggestions,labels,onPick}:{title:string;suggestions:string[];labels?:string[];onPick:(value:string)=>void}){
 if(!suggestions.length)return null;
 return <div className="mt-4 rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p><div className="mt-2 flex flex-wrap gap-2">{suggestions.map((text,index)=><button key={text} type="button" onClick={()=>onPick(text)} title={text} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0c766d] transition hover:border-[#0c766d] hover:bg-[#eef9f7]">{labels?.[index]||`Sugestão ${index+1}`}</button>)}</div><p className="mt-2 text-[11px] leading-4 text-slate-500">Ao clicar, o texto é apenas preenchido no campo. Você pode editar antes de registrar ou enviar.</p></div>;
}
