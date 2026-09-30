"use client";

import { useRef, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { compressImage } from "../../../lib/storage/compress-image";

const bucket="vortex-public-updates";

export function PublicationImageUpload({initialUrl="",initialPath=""}:{initialUrl?:string;initialPath?:string}){
  const root=useRef<HTMLDivElement>(null);
  const [url,setUrl]=useState(initialUrl);
  const [path,setPath]=useState(initialPath);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  function lockForm(locked:boolean){
    const form=root.current?.closest("form");
    form?.querySelectorAll<HTMLButtonElement>("button").forEach(button=>{button.disabled=locked;});
  }

  async function removeTemporary(currentPath:string){
    if(currentPath&&currentPath!==initialPath){
      const supabase=createClient();
      await supabase.storage.from(bucket).remove([currentPath]);
    }
  }

  async function choose(file?:File){
    if(!file)return;
    setBusy(true);setMessage("Otimizando e enviando imagem...");lockForm(true);
    try{
      const optimized=await compressImage(file);
      const nextPath=`publicacoes/${new Date().getFullYear()}/${crypto.randomUUID()}.webp`;
      const supabase=createClient();
      const {error}=await supabase.storage.from(bucket).upload(nextPath,optimized,{contentType:"image/webp",cacheControl:"86400",upsert:false});
      if(error)throw new Error("Não foi possível enviar a imagem.");
      await removeTemporary(path);
      const {data}=supabase.storage.from(bucket).getPublicUrl(nextPath);
      setPath(nextPath);setUrl(data.publicUrl);
      setMessage(`Imagem pronta: ${(optimized.size/1024).toFixed(0)} KB.`);
    }catch(error){
      setMessage(error instanceof Error?error.message:"Não foi possível processar a imagem.");
    }finally{
      setBusy(false);lockForm(false);
    }
  }

  async function clear(){
    setBusy(true);lockForm(true);
    try{await removeTemporary(path);setPath("");setUrl("");setMessage("Imagem removida da publicação.");}
    finally{setBusy(false);lockForm(false);}
  }

  return <div ref={root} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
    <input type="hidden" name="imagePath" value={path}/>
    <input type="hidden" name="imageUrl" value={url}/>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {url?<div role="img" aria-label="Prévia da publicação" className="h-28 w-full rounded-lg bg-cover bg-center sm:w-44" style={{backgroundImage:`url("${url.replaceAll('"','%22')}")`}}/>:<div className="grid h-28 w-full place-items-center rounded-lg bg-slate-200 text-xs font-semibold text-slate-500 sm:w-44">Sem imagem</div>}
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-700">Imagem da publicação</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Envie JPEG, PNG ou WebP. A imagem é otimizada automaticamente antes do envio.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-[#092940] px-4 py-2.5 text-xs font-bold text-white">
            {busy?"Enviando...":url?"Trocar imagem":"Selecionar imagem"}
            <input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event=>{const file=event.target.files?.[0];event.target.value="";void choose(file);}}/>
          </label>
          {url&&<button type="button" disabled={busy} onClick={()=>void clear()} className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">Remover</button>}
        </div>
        {message&&<p className="mt-2 text-xs text-slate-600">{message}</p>}
      </div>
    </div>
  </div>;
}
