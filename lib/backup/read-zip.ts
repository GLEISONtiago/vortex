"use client";

const decoder=new TextDecoder();

export type StoredZip={files:Map<string,Uint8Array>;root:string};

function u16(v:DataView,o:number){return v.getUint16(o,true)}
function u32(v:DataView,o:number){return v.getUint32(o,true)}

export async function readVortexZip(file:File):Promise<StoredZip>{
  const bytes=new Uint8Array(await file.arrayBuffer());
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i-=1){
    if(u32(view,i)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0)throw new Error("O arquivo não é um ZIP válido.");
  const count=u16(view,eocd+10);
  let offset=u32(view,eocd+16);
  const files=new Map<string,Uint8Array>();

  for(let i=0;i<count;i+=1){
    if(u32(view,offset)!==0x02014b50)throw new Error("Estrutura do ZIP inválida.");
    const method=u16(view,offset+10);
    const compressed=u32(view,offset+20);
    const nameLength=u16(view,offset+28);
    const extraLength=u16(view,offset+30);
    const commentLength=u16(view,offset+32);
    const localOffset=u32(view,offset+42);
    const name=decoder.decode(bytes.slice(offset+46,offset+46+nameLength));
    if(method!==0)throw new Error("Este restaurador aceita o ZIP original gerado pelo VÓRTEX. Não compacte novamente a pasta antes de restaurar.");
    if(u32(view,localOffset)!==0x04034b50)throw new Error("Entrada inválida no ZIP.");
    const localNameLength=u16(view,localOffset+26);
    const localExtraLength=u16(view,localOffset+28);
    const start=localOffset+30+localNameLength+localExtraLength;
    files.set(name,bytes.slice(start,start+compressed));
    offset+=46+nameLength+extraLength+commentLength;
  }

  const manifestPath=[...files.keys()].find((name)=>name.endsWith("/manifesto.json"));
  const indexPath=[...files.keys()].find((name)=>name.endsWith("/indice.json"));
  const marker=manifestPath??indexPath;
  if(!marker)throw new Error("Este ZIP não contém um backup reconhecido do VÓRTEX.");
  return {files,root:marker.slice(0,marker.lastIndexOf("/"))};
}

export function zipText(zip:StoredZip,path:string){
  const data=zip.files.get(`${zip.root}/${path}`);
  if(!data)throw new Error(`Arquivo ausente no backup: ${path}`);
  return decoder.decode(data);
}

export function zipJson<T>(zip:StoredZip,path:string):T{
  return JSON.parse(zipText(zip,path)) as T;
}
