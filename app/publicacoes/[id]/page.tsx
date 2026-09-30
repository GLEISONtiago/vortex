import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { BrandMark } from "../../components/brand-mark";

export const dynamic = "force-dynamic";

export default async function PublicacaoDetalhe({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const {data:item}=await createAdminClient().from("vortex_public_updates").select("id,title,summary,content,location,image_url,image_position_x,image_position_y,occurred_at").eq("id",id).eq("published",true).maybeSingle();
 if(!item)notFound();
 const date=new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short"}).format(new Date(item.occurred_at));
 return <main className="min-h-screen bg-[#f4f7f8] text-[#102b42]">
  <header className="bg-[#092940] text-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><BrandMark/><Link href="/#atualizacoes" className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10">Voltar às atualizações</Link></div></header>
  <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
   <Link href="/#atualizacoes" className="text-sm font-bold text-[#0c766d]">← Atualizações da GCMJP</Link>
   <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
    {item.image_url&&<div className="aspect-[16/8] w-full bg-cover bg-center" style={{backgroundImage:`url("${item.image_url.replaceAll('"','%22')}")`,backgroundPosition:`${item.image_position_x??50}% ${item.image_position_y??50}%`}}/>}
    <div className="p-6 sm:p-9">
     <p className="text-xs font-bold tracking-[.14em] text-[#0c766d]">PUBLICAÇÃO INSTITUCIONAL</p>
     <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{item.title}</h1>
     <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500"><time>{date}</time>{item.location&&<span>Local: {item.location}</span>}</div>
     <div className="mt-8 border-t border-slate-200 pt-7"><p className="whitespace-pre-wrap text-base leading-8 text-slate-700">{item.content||item.summary}</p></div>
    </div>
   </div>
  </article>
 </main>;
}
