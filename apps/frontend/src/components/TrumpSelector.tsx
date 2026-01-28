import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Suit, TrumpDecision, TrumpDecisionType, TrumpSelectionState } from '@joker/shared';
import { SuitIcon } from './SuitIcon';

interface TrumpSelectorProps {
  isOpen: boolean;
  onSelect: (decision: TrumpDecision) => void;
  isJokerTrump?: boolean;
  trumpSelection?: TrumpSelectionState | null;
}

export const TrumpSelector: React.FC<TrumpSelectorProps> = ({
  isOpen,
  onSelect,
  isJokerTrump = false,
  trumpSelection,
}) => {
  const { t } = useTranslation();
  const [selectedSuit, setSelectedSuit] = useState<Suit | null | 'none'>('none');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedSuit('none');
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !trumpSelection?.deadlineTs) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((trumpSelection.deadlineTs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, trumpSelection?.deadlineTs]);

  if (!isOpen) return null;

  const suits = [
    { type: Suit.Hearts, color: 'text-red-500', label: t('game.trump.hearts') },
    { type: Suit.Diamonds, color: 'text-red-500', label: t('game.trump.diamonds') },
    { type: Suit.Clubs, color: 'text-slate-200', label: t('game.trump.clubs') },
    { type: Suit.Spades, color: 'text-slate-200', label: t('game.trump.spades') },
  ];

  const canRedeal = trumpSelection?.allowed.redeal ?? false;
  const redealCount = trumpSelection?.redealCount ?? 0;
  const maxRedeals = trumpSelection?.maxRedeals ?? 2;
  const redealsRemaining = maxRedeals - redealCount;

  const handleConfirm = () => {
    if (selectedSuit === 'none') return;

    if (selectedSuit === null) {
      onSelect({ type: TrumpDecisionType.NoTrump });
    } else {
      onSelect({ type: TrumpDecisionType.Suit, suit: selectedSuit });
    }
  };

  const handleRedeal = () => {
    if (canRedeal) {
      onSelect({ type: TrumpDecisionType.Redeal });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 pointer-events-none">
      {/* Semi-transparent overlay only for top part, leaving hand visible */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" style={{ bottom: '30%' }} />

      <div className="relative w-[85%] max-w-[280px] bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto backdrop-blur-md">
        <div className="p-3 text-center border-b border-slate-800">
          <h2 className="text-base font-bold text-white">{t('game.trump.choose')}</h2>
          <p className="text-slate-400 text-[10px] mt-0.5">
            {trumpSelection?.trigger === 'JOKER_UPCARD'
              ? t('game.trump.jokerTrigger', 'Joker flipped - you decide!')
              : t('game.trump.subtitle')}
          </p>
          {timeLeft !== null && (
            <p className="text-amber-400 text-xs mt-1 font-mono">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </p>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {suits.map((suit) => (
              <button
                key={suit.type}
                onClick={() => setSelectedSuit(suit.type)}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200
                  ${
                    selectedSuit === suit.type
                      ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
                  }
                `}
              >
                <SuitIcon suit={suit.type} className={`w-8 h-8 mb-0.5 ${suit.color}`} />
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${selectedSuit === suit.type ? 'text-amber-500' : 'text-slate-400'}`}
                >
                  {suit.label}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setSelectedSuit(null)}
            className={`
              w-full p-2.5 rounded-lg border font-bold text-xs transition-all duration-200 flex items-center justify-center
              ${
                selectedSuit === null
                  ? 'border-amber-500 bg-amber-500/20 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
              }
            `}
          >
            <span className="mr-2 text-base">Ø</span>
            {isJokerTrump ? t('game.trump.noTrumpJoker') : t('game.trump.noTrump')}
          </button>

          {/* Redeal button */}
          {canRedeal && (
            <button
              onClick={handleRedeal}
              className="w-full p-2.5 rounded-lg border border-blue-700 bg-blue-900/50 font-bold text-xs transition-all duration-200 flex items-center justify-center text-blue-300 hover:bg-blue-900 hover:border-blue-600"
            >
              <span className="mr-2">🔄</span>
              {t('game.trump.redeal', 'Redeal')} ({redealsRemaining}/{maxRedeals})
            </button>
          )}

          <button
            onClick={handleConfirm}
            disabled={selectedSuit === 'none'}
            className={`
              w-full py-2.5 mt-1 rounded-lg font-bold text-sm tracking-wide transition-all duration-200
              ${
                selectedSuit !== 'none'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {t('game.trump.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
