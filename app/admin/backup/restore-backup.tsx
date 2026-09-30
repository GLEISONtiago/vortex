"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { readVortexZip, zipJson, type StoredZip } from "../../../lib/backup/read-zip";

type Json=Record<string,unknown>;
type Manifest={system?:string;formatVersion?:number;generatedAt?:string;month?:string;part?:number;totalParts?:number;reports?:Array<{id?:string;protocol?:string;folder:string}>};
type Parsed={zip:StoredZip;manifest:Manifest;items:Array<{folder:string;report:Json;history:Json[];messages:Json[];assignments:Json[]}>};

function decode(data:Uint8Array){return new TextDecoder().decode(data)}
function jsonAt<T>(zip:StoredZip,path:string,fallback:T):T{const d=zip.files.get(`${zip.root}/${path}`);if(!d)return fallback;try{return JSON.parse(decode(d)) as T}catch{return fallback}}

async function parse(file:File):Promise<Parsed>{
  const zip=await readVortexZip(file);
  const manifestData=zip.files.get(`${zip.root}/manifesto.json`);
  let manifest:Manifest;
  let entries:Array<{folder:string}>;

  if(manifestData){
    manifest=JSON.parse(decode(manifestData)) as Manifest;
    if(manifest.system!=="VORTEX")throw new Error("O manifesto não pertence ao VÓRTEX.");
    entries=(manifest.reports??[]).map((r)=>({folder:r.folder}));
  }else{
    manifest={system:"VORTEX",formatVersion:1};
    entries=[...zip.files.keys()]
      .filter((name)=>name.startsWith(`${zip.root}/denuncias/`)&&name.endsWith("/denuncia.json"))
      .map((name)=>({folder:name.slice(zip.root.length+1,-"/denuncia.json".length)}));
  }
  if(!entries.length)throw new Error("Nenhuma denúncia foi encontrada no backup.");

  const items=entries.map(({folder})=>{
    const report=jsonAt<Json>(zip,`${folder}/denuncia.json`,{});
    const attachments=Array.isArray(report.attachments)?report.attachments as Json[]:[];
    const imageFiles=[...zip.files.keys()]
      .filter((name)=>name.startsWith(`${zip.root}/${folder}/anexos/`))
      .sort()
      .map((name)=>name.slice(`${zip.root}/${folder}/`.length));
    let imageIndex=0;
    report.attachments=attachments.map((a)=>{
      if(typeof a.backup_file==="string")return a;
      if(a.storage_deleted_at)return {...a,backup_file:null};
      const backupFile=imageFiles[imageIndex]??null;imageIndex+=1;return {...a,backup_file:backupFile};
    });
    return {
      folder,report,
      history:jsonAt<Json[]>(zip,`${folder}/historico.json`,Array.isArray(report.history)?report.history as Json[]:[]),
      messages:jsonAt<Json[]>(zip,`${folder}/mensagens.json`,Array.isArray(report.messages)?report.messages as Json[]:[]),
      assignments:jsonAt<Json[]>(zip,`${folder}/atribuicoes.json`,Array.isArray(report.assignments)?report.assignments as Json[]:[]),
    };
  });
  return {zip,manifest,items};
}

export function RestoreBackup(){
  const [parsed,setParsed]=useState<Parsed|null>(null);
  const [fileName,setFileName]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const analyze=async(file:File|null)=>{
    setParsed(null);setConfirmation("");setMessage("");if(!file)return;
    setBusy(true);setFileName(file.name);
    try{const data=await parse(file);setParsed(data);setMessage("Backup validado. Revise o resumo antes de restaurar.");}
    catch(error){setMessage(error instanceof Error?error.message:"Não foi possível analisar o backup.");}
    finally{setBusy(false);}
  };

  const restore=async()=>{
    if(!parsed||confirmation!=="RESTAURAR")return;
    setBusy(true);setMessage("");
    const supabase=createClient();
    let recreated=0,attachments=0,processed=0;
    try{
      for(const item of parsed.items){
        const protocol=String(item.report.protocol??"denúncia");
        setMessage(`Preparando ${protocol} (${processed+1}/${parsed.items.length})...`);
        const response=await fetch("/api/admin/backup/restore/prepare",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({formatVersion:parsed.manifest.formatVersion??1,report:item.report,history:item.history,messages:item.messages,assignments:item.assignments}),
        });
        const prepared=await response.json() as {error?:string;reportId?:string;created?:boolean;uploads?:Array<Json>};
        if(!response.ok||prepared.error||!prepared.reportId)throw new Error(prepared.error||`Falha ao preparar ${protocol}.`);

        const completed:Json[]=[];
        for(const upload of prepared.uploads??[]){
          const backupFile=String(upload.backupFile??"");
          const bytes=parsed.zip.files.get(`${parsed.zip.root}/${item.folder}/${backupFile}`);
          if(!bytes)throw new Error(`O anexo ${backupFile} de ${protocol} não foi encontrado no ZIP.`);
          setMessage(`Restaurando anexos de ${protocol}...`);
          const blob=new Blob([bytes.slice().buffer],{type:String(upload.mime_type??"image/webp")});
          const {error}=await supabase.storage.from("vortex-attachments").uploadToSignedUrl(
            String(upload.path),String(upload.token),blob,{contentType:String(upload.mime_type??"image/webp")},
          );
          if(error)throw new Error(`Não foi possível restaurar um anexo de ${protocol}.`);
          completed.push(upload);
        }

        const finalResponse=await fetch("/api/admin/backup/restore/finalize",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({reportId:prepared.reportId,created:prepared.created,attachments:completed}),
        });
        const final=await finalResponse.json() as {error?:string;restoredAttachments?:number};
        if(!finalResponse.ok||final.error)throw new Error(final.error||`Falha ao finalizar ${protocol}.`);
        if(prepared.created)recreated+=1;
        attachments+=Number(final.restoredAttachments??0);
        processed+=1;
      }
      setConfirmation("");
      setMessage(`Restauração concluída: ${processed} denúncia(s) verificadas, ${recreated} recriada(s) e ${attachments} anexo(s) restaurado(s).`);
    }catch(error){
      setMessage(`${error instanceof Error?error.message:"Falha na restauração"} Processadas antes da interrupção: ${processed}.`);
    }finally{setBusy(false);}
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="text-xl font-bold">Restaurar um backup</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">
      Selecione o ZIP original gerado pelo VÓRTEX. O arquivo é lido no navegador; imagens são enviadas diretamente ao Supabase Storage e denúncias já existentes não são sobrescritas.
    </p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="cursor-pointer rounded-lg border border-[#0c766d] px-4 py-2.5 text-center text-sm font-bold text-[#0c766d]">
        {busy?"Analisando...":"Selecionar ZIP"}
        <input className="hidden" type="file" accept=".zip,application/zip" disabled={busy} onChange={(event)=>void analyze(event.target.files?.[0]??null)} />
      </label>
      {fileName&&<span className="text-sm text-slate-600">{fileName}</span>}
    </div>

    {parsed&&<div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="grid gap-3 sm:grid-cols-4">
        <div><p className="text-xs font-bold text-slate-500">FORMATO</p><p className="mt-1 font-bold">VÓRTEX v{parsed.manifest.formatVersion??1}</p></div>
        <div><p className="text-xs font-bold text-slate-500">DENÚNCIAS</p><p className="mt-1 font-bold">{parsed.items.length}</p></div>
        <div><p className="text-xs font-bold text-slate-500">PERÍODO</p><p className="mt-1 font-bold">{parsed.manifest.month??"Backup legado"}</p></div>
        <div><p className="text-xs font-bold text-slate-500">PARTE</p><p className="mt-1 font-bold">{parsed.manifest.part??1}/{parsed.manifest.totalParts??1}</p></div>
      </div>
      {(parsed.manifest.formatVersion??1)<2&&<p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Backup antigo: ele pode recuperar anexos de denúncias ainda existentes. Para recriar uma denúncia que não exista mais no banco, use backups novos no formato v2.</p>}
      <p className="mt-4 text-sm text-slate-700">A restauração nunca substitui uma denúncia existente. Ela recupera anexos ausentes; se a denúncia não existir e o backup for v2, recria o registro preservando protocolo, datas, histórico e mensagens.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input value={confirmation} onChange={(e)=>setConfirmation(e.target.value.toUpperCase())} placeholder='Digite "RESTAURAR"' className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" />
        <button type="button" disabled={busy||confirmation!=="RESTAURAR"} onClick={()=>void restore()} className="rounded-lg bg-[#0c766d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy?"Restaurando...":"Restaurar backup"}</button>
      </div>
    </div>}
    {message&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
  </section>;
}
