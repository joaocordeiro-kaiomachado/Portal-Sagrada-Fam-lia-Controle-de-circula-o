/** Marca do Portal Sagrada Família (mesmo símbolo do site de referência). */
export function BrandMark({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm ${className}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19.5V8.7L12 4l8 4.7v10.8" />
        <path d="M2.5 20h19M8 20v-6h8v6M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    </div>
  );
}

export function Brand({ subtitle = 'Controle de circulação', compact }: { subtitle?: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div>
        <p className={`font-bold whitespace-nowrap text-muted uppercase ${compact ? 'text-[10.5px] tracking-[0.12em]' : 'text-[11px] tracking-[0.18em]'}`}>Portal Sagrada Família</p>
        <p className="mt-0.5 text-[15px] font-semibold text-ink">{subtitle}</p>
      </div>
    </div>
  );
}
