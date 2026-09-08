type BrandMarkProps = { compact?: boolean };

export function BrandMark({ compact = false }: BrandMarkProps) {
  return <div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0c766d] text-white shadow-sm"><svg viewBox="0 0 32 32" className="size-6 fill-none" stroke="currentColor" strokeWidth="2.25"><path d="M16 3.5 26 7v7.9c0 6.3-4.1 11.5-10 13.6-5.9-2.1-10-7.3-10-13.6V7l10-3.5Z" /><path d="m11.2 15.7 3.2 3.2 6.6-7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{!compact && <span className="leading-none"><span className="block text-lg font-bold tracking-[0.14em] text-white">VÓRTEX</span><span className="mt-1 block text-[10px] font-medium tracking-[0.12em] text-slate-300">CANAL SEGURO GCMJP</span></span>}</div>;
}
