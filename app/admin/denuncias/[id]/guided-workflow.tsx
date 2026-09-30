"use client";

type Props={
 role?:string|null;
 currentStatus:string;
 unitName?:string|null;
 hasAssignment:boolean;
 canRoute:boolean;
 canAssign:boolean;
 canUpdateStatus:boolean;
};

const statusNames:Record<string,string>={NOVA:"Nova",EM_ANALISE:"Em análise",EM_ATENDIMENTO:"Em atendimento",FINALIZADA:"Finalizada"};

export function GuidedWorkflow({role,currentStatus,unitName,hasAssignment,canRoute,canAssign,canUpdateStatus}:Props){
 const routed=Boolean(unitName);
 const assigned=hasAssignment;
 const statusDone=currentStatus==="FINALIZADA";
 const go=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
 const routeText=!routed
  ? canRoute?"Selecione o grupamento que receberá a denúncia.":"Aguardando triagem da Diretoria Operacional."
  : !assigned
    ? canAssign?"O grupamento já foi definido. Agora atribua um responsável.":"Grupamento definido; aguardando atribuição de responsável."
    :"Encaminhamento concluído e responsável definido.";
 return <section className="mt-6 overflow-hidden rounded-2xl bg-[#102b42] text-white shadow-sm">
  <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
   <div><p className="text-xs font-black tracking-[.16em] text-[#74d5c9]">ROTEIRO DE ATENDIMENTO</p><h2 className="mt-1 text-xl font-bold">Próximos passos desta denúncia</h2></div>
   <p className="text-xs text-slate-300">Perfil: {role||"Usuário"}</p>
  </div>
  <div className="grid md:grid-cols-3">
   <Step number="1" title="Encaminhar" done={routed&&assigned} active={!routed||!assigned} text={routeText} action={(canRoute&&!routed)||(canAssign&&routed&&!assigned)?()=>go("encaminhamento"):undefined} actionLabel={!routed?"Fazer triagem":"Atribuir responsável"}/>
   <Step number="2" title="Atualizar andamento" done={statusDone} active={routed&&assigned&&!statusDone} text={statusDone?"Atendimento finalizado.":canUpdateStatus?`Status atual: ${statusNames[currentStatus]||currentStatus}. Atualize conforme o atendimento avançar.`:"O andamento é atualizado pelo responsável autorizado."} action={canUpdateStatus&&!statusDone?()=>go("andamento"):undefined} actionLabel="Alterar status"/>
   <Step number="3" title="Dar retorno" done={false} active={routed} text="Mantenha o denunciante informado ou solicite complementos quando necessário." action={()=>go("comunicacao")} actionLabel="Escrever mensagem"/>
  </div>
 </section>;
}
function Step({number,title,text,done,active,action,actionLabel}:{number:string;title:string;text:string;done:boolean;active:boolean;action?:()=>void;actionLabel:string}){
 return <div className="border-t border-white/10 p-5 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0 sm:p-6">
  <div className="flex items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${done?"bg-[#74d5c9] text-[#102b42]":active?"bg-[#e8b74e] text-[#102b42]":"bg-white/10 text-white"}`}>{done?"✓":number}</span><h3 className="font-bold">{title}</h3></div>
  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">{text}</p>
  {action&&<button type="button" onClick={action} className="mt-3 text-sm font-bold text-[#74d5c9] underline decoration-white/20 underline-offset-4 hover:text-white">{actionLabel} ↓</button>}
 </div>;
}
