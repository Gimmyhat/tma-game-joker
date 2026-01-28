import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Suit } from '@joker/shared';
import { useGameStore } from '../../store/gameStore';
import { SuitIcon } from '../SuitIcon';

export const TrumpSelectionModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    gameState,
    isTrumpChooser,
    getTrumpSelection,
    selectTrumpSuit,
    selectNoTrump,
    requestRedeal,
  } = useGameStore();

  const [timeLeft, setTimeLeft] = useState(0);

  const trumpSelection = getTrumpSelection();
  const isChooser = isTrumpChooser();

  useEffect(() => {
    if (!trumpSelection?.deadlineTs) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.ceil((trumpSelection.deadlineTs - Date.now()) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [trumpSelection?.deadlineTs]);

  if (gameState?.phase !== 'trump_selection' || !trumpSelection) {
    return null;
  }

  const chooserName =
    gameState.players.find((p) => p.id === trumpSelection.chooserPlayerId)?.name || 'Unknown';

  const suits = [
    { type: Suit.Hearts, color: 'text-red-500', label: t('game.trump.hearts') },
    { type: Suit.Diamonds, color: 'text-red-500', label: t('game.trump.diamonds') },
    { type: Suit.Clubs, color: 'text-slate-200', label: t('game.trump.clubs') },
    { type: Suit.Spades, color: 'text-slate-200', label: t('game.trump.spades') },
  ];

  // Disable all actions when timer expires (prevents race condition with backend timeout)
  const isTimedOut = timeLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" />

      {/* Modal Content - Compact for mobile landscape */}
      <div className="relative w-full max-w-xs md:max-w-sm bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-2 md:p-4 text-center border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-base md:text-xl font-bold text-white">
            {isChooser ? t('game.trump.choose') : t('game.trump.waitingFor', { name: chooserName })}
          </h2>
          <div className="mt-1 md:mt-2 flex items-center justify-center gap-2">
            <div className="text-[10px] md:text-xs font-mono text-slate-400 bg-slate-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
              {timeLeft}s
            </div>
            {isChooser && (
              <div className="text-[10px] md:text-xs text-slate-400">
                Redeals: {trumpSelection.redealCount}/{trumpSelection.maxRedeals}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-2 md:p-4">
          {isChooser ? (
            <div className="space-y-2 md:space-y-3">
              {/* Suit Selection - Compact grid */}
              <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                {suits.map((suit) => (
                  <button
                    key={suit.type}
                    onClick={() => selectTrumpSuit(suit.type)}
                    disabled={isTimedOut || !trumpSelection.allowed.suits.includes(suit.type)}
                    className={`
                      flex flex-col items-center justify-center p-2 md:p-3 rounded-lg md:rounded-xl border transition-all duration-200
                      ${
                        isTimedOut || !trumpSelection.allowed.suits.includes(suit.type)
                          ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900'
                          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-amber-500/50 hover:shadow-[0_0_10px_rgba(245,158,11,0.1)] active:scale-95'
                      }
                    `}
                  >
                    <SuitIcon
                      suit={suit.type}
                      className={`w-6 h-6 md:w-8 md:h-8 mb-0.5 md:mb-1 ${suit.color}`}
                    />
                    <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {suit.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* No Trump Option */}
              <button
                onClick={() => selectNoTrump()}
                disabled={isTimedOut || !trumpSelection.allowed.noTrump}
                className={`
                  w-full p-2 md:p-3 rounded-lg md:rounded-xl border font-bold text-xs md:text-sm transition-all duration-200 flex items-center justify-center
                  ${
                    isTimedOut || !trumpSelection.allowed.noTrump
                      ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 active:scale-[0.98]'
                  }
                `}
              >
                <span className="mr-1.5 md:mr-2 text-base md:text-lg">Ø</span>
                {t('game.trump.noTrump')}
              </button>

              {/* Redeal Option */}
              <button
                onClick={() => requestRedeal()}
                disabled={isTimedOut || !trumpSelection.allowed.redeal}
                className={`
                  w-full py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 md:gap-2
                  ${
                    isTimedOut || !trumpSelection.allowed.redeal
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                      : 'bg-slate-800 text-amber-500 border border-amber-900/30 hover:bg-amber-900/10 hover:border-amber-500/50 active:scale-[0.98]'
                  }
                `}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 md:h-4 md:w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('game.trump.redeal')}
                <span className="text-[10px] md:text-xs font-normal opacity-70 ml-0.5 md:ml-1">
                  ({trumpSelection.maxRedeals - trumpSelection.redealCount} left)
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 md:py-8 space-y-2 md:space-y-4">
              <div className="relative w-10 h-10 md:w-16 md:h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
              </div>
              <p className="text-slate-400 text-xs md:text-sm text-center max-w-[200px]">
                {t('game.trump.waitingDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
