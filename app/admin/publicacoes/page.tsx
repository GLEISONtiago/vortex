import { requireAdmin } from "../../../lib/auth/require-admin";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createPublicUpdate, deletePublicUpdate, updatePublicUpdate } from "./actions";

function localInput(value:string){const d=new Date(value);const pad=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}

export default async function PublicacoesPage(){
  await requireAdmin();
  const {data:updates}=await createAdminClient().from("vortex_public_updates").select("*").order("occurred_at",{ascending:false}).limit(50);
  return <div className="max-w-5xl">
    <p className="text-xs font-bold tracking-[.16em] text-[#0c766d]">CONTEÚDO PÚBLICO</p>
    <h1 className="mt-2 text-3xl font-bold">Publicações da página inicial</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Cadastre apenas informações já autorizadas para divulgação pública. O VÓRTEX nunca transforma denúncias em publicações automaticamente.</p>

    <form action={createPublicUpdate} className="mt-7 grid gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-xl font-bold">Nova publicação</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Título<input name="title" required maxLength={160} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-semibold">Local (opcional)<input name="location" maxLength={160} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
      </div>
      <label className="text-sm font-semibold">Resumo<textarea name="summary" required minLength={10} maxLength={600} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Data e hora<input name="occurredAt" type="datetime-local" defaultValue={localInput(new Date().toISOString())} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
        <label className="text-sm font-semibold">URL HTTPS da imagem (opcional)<input name="imageUrl" type="url" placeholder="https://..." className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input name="published" type="checkbox" /> Publicar imediatamente</label>
      <button className="w-fit rounded-lg bg-[#0c766d] px-5 py-2.5 text-sm font-bold text-white">Criar publicação</button>
    </form>

    <section className="mt-8">
      <h2 className="text-xl font-bold">Publicações cadastradas</h2>
      <div className="mt-4 grid gap-4">
        {(updates??[]).map((item)=><form action={updatePublicUpdate} key={item.id} className="grid gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <input type="hidden" name="id" value={item.id} />
          <div className="flex items-center justify-between gap-4"><strong>{item.title}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.published?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{item.published?"Publicada":"Rascunho"}</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="title" required maxLength={160} defaultValue={item.title} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="location" maxLength={160} defaultValue={item.location??""} placeholder="Local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea name="summary" required minLength={10} maxLength={600} rows={2} defaultValue={item.summary} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="grid gap-3 md:grid-cols-2">
            <input name="occurredAt" type="datetime-local" defaultValue={localInput(item.occurred_at)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="imageUrl" type="url" defaultValue={item.image_url??""} placeholder="URL HTTPS da imagem" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input name="published" type="checkbox" defaultChecked={item.published} /> Publicada</label>
          <div className="flex flex-wrap gap-2"><button className="rounded-lg bg-[#0c766d] px-4 py-2 text-sm font-bold text-white">Salvar alterações</button><button formAction={deletePublicUpdate} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Excluir</button></div>
        </form>)}
        {!(updates??[]).length&&<p className="rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">Nenhuma publicação cadastrada.</p>}
      </div>
    </section>
  </div>;
}
