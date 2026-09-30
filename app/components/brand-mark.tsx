import Image from "next/image";

type BrandMarkProps = { compact?: boolean };

export function BrandMark({ compact = false }: BrandMarkProps) {
  return <div className="flex items-center gap-3">
    <span aria-hidden="true" className="grid h-12 w-11 shrink-0 place-items-center">
      <Image
        src="/gcmjp-logo.png"
        alt=""
        width={44}
        height={50}
        priority
        className="h-12 w-auto object-cover drop-shadow-[0_2px_3px_rgba(0,0,0,.35)] [clip-path:polygon(50%_0%,96%_10%,100%_55%,93%_75%,78%_90%,50%_100%,22%_90%,7%_75%,0%_55%,4%_10%)]"
      />
    </span>
    {!compact && <span className="leading-none">
      <span className="block text-lg font-black tracking-[0.13em] text-white">VÓRTEX</span>
      <span className="mt-1 block text-[9px] font-bold tracking-[0.11em] text-slate-300">GCMJP · CANAL INSTITUCIONAL</span>
    </span>}
  </div>;
}
