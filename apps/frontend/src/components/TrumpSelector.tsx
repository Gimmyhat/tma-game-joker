import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Suit } from '@joker/shared';
import { SuitIcon } from './SuitIcon';

interface TrumpSelectorProps {
  isOpen: boolean;
  onSelect: (suit: Suit | null) => void;
  isJokerTrump?: boolean;
}

export const TrumpSelector: React.FC<TrumpSelectorProps> = ({
  isOpen,
  onSelect,
  isJokerTrump = false,
}) => {
  const { t } = useTranslation();
  const [selectedSuit, setSelectedSuit] = useState<Suit | null | 'none'>('none');

  useEffect(() => {
    if (isOpen) {
      // If Joker is trump, default to No Trump is natural, but we explicitly set it
      setSelectedSuit('none');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const suits = [
    { type: Suit.Hearts, color: 'text-red-500', label: t('game.trump.hearts') },
    { type: Suit.Diamonds, color: 'text-red-500', label: t('game.trump.diamonds') },
    { type: Suit.Clubs, color: 'text-slate-200', label: t('game.trump.clubs') },
    { type: Suit.Spades, color: 'text-slate-200', label: t('game.trump.spades') },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 pointer-events-none">
      {/* Semi-transparent overlay only for top part, leaving hand visible */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" style={{ bottom: '30%' }} />

      <div className="relative w-full max-w-sm bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto backdrop-blur-md">
        <div className="p-4 text-center border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">{t('game.trump.choose')}</h2>
          <p className="text-slate-400 text-xs mt-1">{t('game.trump.subtitle')}</p>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {suits.map((suit) => (
              <button
                key={suit.type}
                onClick={() => setSelectedSuit(suit.type)}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                  ${
                    selectedSuit === suit.type
                      ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
                  }
                `}
              >
                <SuitIcon suit={suit.type} className={`w-10 h-10 mb-1 ${suit.color}`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${selectedSuit === suit.type ? 'text-amber-500' : 'text-slate-400'}`}
                >
                  {suit.label}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setSelectedSuit(null)}
            className={`
              w-full p-3 rounded-xl border font-bold text-sm transition-all duration-200 flex items-center justify-center
              ${
                selectedSuit === null
                  ? 'border-amber-500 bg-amber-500/20 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
              }
            `}
          >
            <span className="mr-2 text-lg">Ø</span>
            {isJokerTrump ? t('game.trump.noTrumpJoker') : t('game.trump.noTrump')}
          </button>

          <button
            onClick={() => onSelect(selectedSuit === 'none' ? null : selectedSuit)}
            disabled={selectedSuit === 'none'}
            className={`
              w-full py-3 mt-1 rounded-xl font-bold text-base tracking-wide transition-all duration-200
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
