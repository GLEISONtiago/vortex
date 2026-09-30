import Image from "next/image";

type BrandMarkProps = { compact?: boolean };

export function BrandMark({ compact = false }: BrandMarkProps) {
  return <div className="flex items-center gap-3">
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1 shadow-sm ring-1 ring-white/20">
      <Image src="/gcmjp-logo.png" alt="" width={42} height={48} priority className="h-full w-auto object-contain" />
    </span>
    {!compact && <span className="leading-none">
      <span className="block text-lg font-black tracking-[0.13em] text-white">VÓRTEX</span>
      <span className="mt-1 block text-[9px] font-bold tracking-[0.11em] text-slate-300">GCMJP · CANAL INSTITUCIONAL</span>
    </span>}
  </div>;
}
