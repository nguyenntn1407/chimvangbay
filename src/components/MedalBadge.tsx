interface MedalBadgeProps {
  score: number;
}

interface MedalTier {
  label: string;
  rimColor: string;
  fillColor: string;
  highlightColor: string;
  ribbonColor: string;
}

export function getMedalTier(score: number): MedalTier | null {
  if (score >= 45) {
    return {
      label: 'Bạch Kim',
      rimColor: '#475569',
      fillColor: '#E2E8F0',
      highlightColor: '#FFFFFF',
      ribbonColor: '#0284C7',
    };
  }
  if (score >= 30) {
    return {
      label: 'Vàng',
      rimColor: '#B45309',
      fillColor: '#FACC15',
      highlightColor: '#FEF08A',
      ribbonColor: '#DC2626',
    };
  }
  if (score >= 20) {
    return {
      label: 'Bạc',
      rimColor: '#64748B',
      fillColor: '#CBD5E1',
      highlightColor: '#F8FAFC',
      ribbonColor: '#2563EB',
    };
  }
  if (score >= 10) {
    return {
      label: 'Đồng',
      rimColor: '#7C2D12',
      fillColor: '#D97706',
      highlightColor: '#FDBA74',
      ribbonColor: '#059669',
    };
  }
  return null;
}

export function MedalBadge({ score }: MedalBadgeProps) {
  const tier = getMedalTier(score);

  if (!tier) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-100/80">
          <span className="text-xs font-semibold text-slate-400">10+</span>
        </div>
        <span className="text-xs font-medium text-slate-500">Chưa có huy chương</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Huy chương ${tier.label}`}
      >
        <path d="M18 4H26L28 16H20L18 4Z" fill={tier.ribbonColor} />
        <path d="M38 4H30L28 16H36L38 4Z" fill={tier.ribbonColor} fillOpacity="0.82" />
        <circle cx="28" cy="32" r="18" fill={tier.fillColor} stroke={tier.rimColor} strokeWidth="3" />
        <circle cx="28" cy="32" r="13" stroke={tier.highlightColor} strokeWidth="2" strokeOpacity="0.8" />
        <path
          d="M28 22L30.6 27.4L36.5 28.2L32.2 32.3L33.2 38.2L28 35.4L22.8 38.2L23.8 32.3L19.5 28.2L25.4 27.4L28 22Z"
          fill={tier.highlightColor}
        />
      </svg>
      <span className="text-xs font-semibold text-slate-700">{tier.label}</span>
    </div>
  );
}
