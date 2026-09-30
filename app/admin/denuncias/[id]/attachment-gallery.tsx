"use client";

import { useEffect, useState } from "react";

type Attachment = {
  id: string;
  name: string;
  url: string;
  sizeLabel: string;
  backedUp: boolean;
};

export function AttachmentGallery({ attachments }: { attachments: Attachment[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? null : attachments[selected];

  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft") setSelected((value) => value === null ? null : (value - 1 + attachments.length) % attachments.length);
      if (event.key === "ArrowRight") setSelected((value) => value === null ? null : (value + 1) % attachments.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, attachments.length]);

  if (!attachments.length) return <p className="text-sm text-slate-600">Nenhum anexo disponível.</p>;

  return <>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {attachments.map((attachment, index) => (
        <button key={attachment.id} type="button" onClick={() => setSelected(index)} className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left transition hover:border-[#0c766d] focus:outline-none focus:ring-2 focus:ring-[#0c766d]">
          <div className="aspect-[4/3] overflow-hidden bg-slate-100">
            <img src={attachment.url} alt={attachment.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-[#102b42]">{attachment.name}</p>
            <p className="mt-1 text-xs text-slate-500">{attachment.sizeLabel}{attachment.backedUp ? " · backup confirmado" : ""}</p>
          </div>
        </button>
      ))}
    </div>

    {current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Visualizador de anexos" onClick={() => setSelected(null)}>
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0"><p className="truncate font-semibold">{current.name}</p><p className="text-xs text-slate-300">Imagem {(selected ?? 0) + 1} de {attachments.length}</p></div>
          <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">Fechar ×</button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
          <img src={current.url} alt={current.name} className="max-h-[78vh] max-w-full object-contain" />
          {attachments.length > 1 && <>
            <button type="button" aria-label="Imagem anterior" onClick={() => setSelected(((selected ?? 0) - 1 + attachments.length) % attachments.length)} className="absolute left-3 rounded-full bg-black/60 px-4 py-3 text-xl text-white hover:bg-black/80">‹</button>
            <button type="button" aria-label="Próxima imagem" onClick={() => setSelected(((selected ?? 0) + 1) % attachments.length)} className="absolute right-3 rounded-full bg-black/60 px-4 py-3 text-xl text-white hover:bg-black/80">›</button>
          </>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-200"><span>{current.sizeLabel}</span><a href={current.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/30 px-4 py-2 font-semibold hover:bg-white/10">Abrir original</a></div>
      </div>
    </div>}
  </>;
}
