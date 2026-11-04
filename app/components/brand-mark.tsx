import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = { compact?: boolean };

export function BrandMark({ compact = false }: BrandMarkProps) {
  return <Link href="/" aria-label="VÓRTEX — ir para a página inicial" className="flex w-fit items-center gap-3 rounded-md transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b74e]">
    <span aria-hidden="true" className="grid h-14 w-12 shrink-0 place-items-center">
      <Image
        src="/gcmjp-logo-clean.svg"
        alt=""
        width={44}
        height={50}
        priority
        className="h-14 w-auto object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]"
      />
    </span>
    {!compact && <span className="leading-none">
      <span className="block text-lg font-black tracking-[0.13em] text-white">VÓRTEX</span>
      <span className="mt-1 block text-[9px] font-bold tracking-[0.11em] text-slate-300">GCMJP · CANAL INSTITUCIONAL</span>
    </span>}
  </Link>;
}
