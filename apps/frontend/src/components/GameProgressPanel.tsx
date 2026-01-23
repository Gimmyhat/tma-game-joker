import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface GameProgressPanelProps {
  currentRound: number;
  totalRounds?: number;
}

interface PulkaInfo {
  id: number;
  range: [number, number];
  cardsPattern: string;
  translationKey: string;
}

const PULKAS: PulkaInfo[] = [
  { id: 1, range: [1, 8], cardsPattern: '1 → 8', translationKey: 'ascending' },
  { id: 2, range: [9, 12], cardsPattern: '9', translationKey: 'maximum' },
  { id: 3, range: [13, 20], cardsPattern: '8 → 1', translationKey: 'descending' },
  { id: 4, range: [21, 24], cardsPattern: '9', translationKey: 'final' },
];

export const GameProgressPanel: React.FC<GameProgressPanelProps> = ({
  currentRound,
  totalRounds = 24,
}) => {
  const { t } = useTranslation();
  // Determine current pulka
  const currentPulka = useMemo(() => {
    return PULKAS.find((p) => currentRound >= p.range[0] && currentRound <= p.range[1]);
  }, [currentRound]);

  const progressPercent = Math.min(100, (currentRound / totalRounds) * 100);

  return (
    <div className="flex flex-col gap-2 w-full max-w-md pointer-events-auto">
      {/* Main Progress Bar */}
      <div className="relative h-2 w-full bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Pulka Dividers */}
        {[8, 12, 20].map((roundBreak) => (
          <div
            key={roundBreak}
            className="absolute top-0 bottom-0 w-px bg-black/50 z-10"
            style={{ left: `${(roundBreak / totalRounds) * 100}%` }}
          />
        ))}
      </div>

      {/* Pulka Blocks */}
      <div className="flex justify-between gap-1">
        {PULKAS.map((pulka) => {
          const isActive = currentPulka?.id === pulka.id;
          const isPast = currentRound > pulka.range[1];

          return (
            <div
              key={pulka.id}
              className={`
                flex flex-col items-center flex-1 p-1.5 rounded-lg border backdrop-blur-md transition-all duration-300
                ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : isPast
                      ? 'bg-green-900/20 border-green-500/20 opacity-60'
                      : 'bg-black/20 border-white/5 opacity-40'
                }
              `}
            >
              <div className="flex items-center gap-1 mb-1">
                <span
                  className={`
                  text-[9px] font-bold uppercase tracking-wider
                  ${isActive ? 'text-amber-400' : isPast ? 'text-green-400' : 'text-slate-500'}
                `}
                >
                  {t('game.pulka.title', { id: pulka.id })}
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5 w-full">
                <div className="flex justify-between w-full px-1">
                  <span className="text-[8px] text-slate-400 uppercase tracking-wide">
                    {t('game.round')}s
                  </span>
                  <span
                    className={`text-[8px] font-mono ${isActive ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    {pulka.range[0]}-{pulka.range[1]}
                  </span>
                </div>
                <div className="w-full h-px bg-white/5 my-0.5" />
                <div className="flex justify-between w-full px-1">
                  <span className="text-[8px] text-slate-400 uppercase tracking-wide">
                    {t('game.cards')}
                  </span>
                  <span
                    className={`text-[8px] font-mono ${isActive ? 'text-white font-bold' : 'text-slate-500'}`}
                  >
                    {pulka.cardsPattern}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
