"use client";
import { useMemo,useState,useTransition } from "react";
import { finalizeReport } from "./workflow-actions";

const resolutions=[
 ["PROCEDENTE","Procedente"],
 ["IMPROCEDENTE","Improcedente"],
 ["RESOLVIDA","Resolvida"],
 ["ENCAMINHADA_OUTRO_ORGAO","Encaminhada a outro órgão"],
 ["NAO_FOI_POSSIVEL_AVERIGUAR","Não foi possível averiguar"]
] as const;

const summaryTemplates:Record<string,string>={
 PROCEDENTE:"Os fatos relatados foram confirmados durante a averiguação e as providências cabíveis foram adotadas.",
 IMPROCEDENTE:"Após análise e averiguação, não foram encontrados elementos suficientes para confirmar os fatos relatados.",
 RESOLVIDA:"A situação foi averiguada pela equipe responsável e as providências necessárias foram adotadas, com encerramento do atendimento.",
 ENCAMINHADA_OUTRO_ORGAO:"A situação foi analisada e encaminhada ao órgão competente para continuidade das providências.",
 NAO_FOI_POSSIVEL_AVERIGUAR:"Não foi possível concluir a averiguação com os elementos disponíveis no momento do atendimento."
};

const messageTemplates:Record<string,string>={
 PROCEDENTE:"Sua denúncia foi finalizada. Os fatos informados foram averiguados e as providências cabíveis foram registradas no atendimento.",
 IMPROCEDENTE:"Sua denúncia foi finalizada após análise e averiguação das informações apresentadas. O resultado está registrado neste protocolo.",
 RESOLVIDA:"Sua denúncia foi finalizada. A equipe responsável realizou o atendimento e registrou as providências adotadas.",
 ENCAMINHADA_OUTRO_ORGAO:"Sua denúncia foi finalizada no VÓRTEX e encaminhada ao órgão competente para continuidade das providências.",
 NAO_FOI_POSSIVEL_AVERIGUAR:"Sua denúncia foi finalizada. Não foi possível concluir a averiguação com as informações disponíveis neste momento."
};

export function FinalizationPanel({reportId,currentStatus,currentResolution,forwardedAgency,canFinalize}:{reportId:string;currentStatus:string;currentResolution?:string|null;forwardedAgency?:string|null;canFinalize:boolean}){
 const [resolution,setResolution]=useState(currentResolution||"");
 const [summary,setSummary]=useState("");
 const [message,setMessage]=useState("");
 const [agency,setAgency]=useState(forwardedAgency||"");
 const [feedback,setFeedback]=useState("");
 const [pending,startTransition]=useTransition();
 const alreadyFinalized=currentStatus==="FINALIZADA";
 const suggestedSummary=useMemo(()=>summaryTemplates[resolution]||"",[resolution]);
 const suggestedMessage=useMemo(()=>messageTemplates[resolution]||"",[resolution]);

 if(alreadyFinalized)return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[.14em] text-emerald-700">Atendimento concluído</p><h3 className="mt-2 text-xl font-bold text-emerald-950">Esta denúncia já foi finalizada.</h3><p className="mt-2 text-sm leading-6 text-emerald-900">Resultado registrado: <b>{labelResolution(currentResolution)}</b>{forwardedAgency?<> · Encaminhada para <b>{forwardedAgency}</b></>:null}.</p></section>;

 if(!canFinalize)return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h3 className="font-bold text-[#102b42]">Finalização</h3><p className="mt-2 text-sm leading-6 text-slate-600">A finalização deve ser realizada pelo perfil operacional autorizado após o atendimento.</p></section>;

 return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
  <div><h3 className="font-bold text-[#102b42]">Finalizar atendimento</h3><p className="mt-1 text-sm leading-6 text-slate-500">Registre o resultado, faça um resumo objetivo das providências e revise a mensagem que será enviada ao denunciante.</p></div>
  <div className="mt-5 grid gap-5">
   <label className="text-sm font-semibold text-slate-700">Resultado<select value={resolution} onChange={e=>{const v=e.target.value;setResolution(v);setSummary(summaryTemplates[v]||"");setMessage(messageTemplates[v]||"");if(v!=="ENCAMINHADA_OUTRO_ORGAO")setAgency("");}} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"><option value="">Selecione o resultado</option>{resolutions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   {resolution==="ENCAMINHADA_OUTRO_ORGAO"&&<label className="text-sm font-semibold text-slate-700">Órgão de destino<input value={agency} onChange={e=>setAgency(e.target.value)} maxLength={200} placeholder="Ex.: SEMOB, Polícia Civil, Secretaria competente..." className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"/></label>}
   {resolution&&<div className="rounded-xl bg-[#eef9f7] p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[#0c766d]">Sugestão do VÓRTEX</p><p className="mt-2 text-sm leading-6 text-slate-700">{suggestedSummary}</p><button type="button" onClick={()=>setSummary(suggestedSummary)} className="mt-2 text-sm font-bold text-[#0c766d] underline underline-offset-4">Usar no resumo</button></div>}
   <label className="text-sm font-semibold text-slate-700">Resumo do atendimento<textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={5} maxLength={2000} placeholder="Resuma o que foi verificado e quais providências foram adotadas." className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"/></label>
   <label className="text-sm font-semibold text-slate-700">Mensagem final ao denunciante<textarea value={message} onChange={e=>setMessage(e.target.value)} rows={5} maxLength={2000} placeholder="Mensagem que ficará disponível no acompanhamento do protocolo." className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"/></label>
   <button disabled={pending||!resolution||summary.trim().length<10||message.trim().length<2||(resolution==="ENCAMINHADA_OUTRO_ORGAO"&&!agency.trim())} onClick={()=>startTransition(async()=>{setFeedback("");const r=await finalizeReport(reportId,resolution,summary,message,agency);setFeedback(r.error||r.message||"");})} className="min-h-12 rounded-lg bg-[#0c766d] px-5 text-sm font-bold text-white disabled:opacity-50">{pending?"Finalizando...":"Finalizar denúncia e enviar retorno"}</button>
   {feedback&&<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{feedback}</p>}
  </div>
 </section>;
}
function labelResolution(value?:string|null){return resolutions.find(([key])=>key===value)?.[1]||value||"Não informado";}
