import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { JokerOption, Suit } from '@joker/shared';

interface JokerOptionModalProps {
  isOpen: boolean;
  onSelect: (option: JokerOption, requestedSuit?: Suit) => void;
  leadSuit?: Suit;
  /** True if this joker is leading the trick (first card on table) */
  isLeading: boolean;
}

export const JokerOptionModal: React.FC<JokerOptionModalProps> = ({
  isOpen,
  onSelect,
  leadSuit,
  isLeading,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'option' | 'suit'>('option');
  const [selectedOption, setSelectedOption] = useState<JokerOption | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('option');
      setSelectedOption(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOptionSelect = (option: JokerOption) => {
    if (option === JokerOption.High || option === JokerOption.Low) {
      setSelectedOption(option);
      setStep('suit');
    } else {
      onSelect(option);
    }
  };

  const handleSuitSelect = (suit: Suit) => {
    if (selectedOption) {
      onSelect(selectedOption, suit);
    }
  };

  // All possible joker options
  const allOptions = [
    {
      id: JokerOption.High,
      label: t('game.joker.highRequest'),
      subLabel: t('game.joker.requestHighest'),
      icon: '⬆️',
      color: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400',
      leadingOnly: true, // Only available when leading the trick
    },
    {
      id: JokerOption.Low,
      label: t('game.joker.lowRequest'),
      subLabel: t('game.joker.requestLowest'),
      icon: '⬇️',
      color: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400',
      leadingOnly: true, // Only available when leading the trick
    },
    {
      id: JokerOption.Top,
      label: t('game.joker.takeHigh'),
      subLabel: t('game.joker.beatsHighest'),
      icon: '👑',
      color: 'bg-amber-500/10 border-amber-500/50 text-amber-400',
      leadingOnly: false, // Only available when NOT leading
    },
    {
      id: JokerOption.Bottom,
      label: t('game.joker.takeLow'),
      subLabel: t('game.joker.beatsLowest'),
      icon: '🛡️',
      color: 'bg-purple-500/10 border-purple-500/50 text-purple-400',
      leadingOnly: false, // Only available when NOT leading
    },
  ];

  // No longer filtering options to show all possibilities (disabled states)
  // Leading (first card): High/Low active, Top/Bottom disabled
  // Following (not first): Top/Bottom active, High/Low disabled
  const options = allOptions; // Show all

  const suits = [
    { type: Suit.Hearts, symbol: '♥', color: 'text-red-500', label: t('game.trump.hearts') },
    { type: Suit.Diamonds, symbol: '♦', color: 'text-red-500', label: t('game.trump.diamonds') },
    { type: Suit.Clubs, symbol: '♣', color: 'text-slate-200', label: t('game.trump.clubs') },
    { type: Suit.Spades, symbol: '♠', color: 'text-slate-200', label: t('game.trump.spades') },
  ];

  const leadSuitInfo = leadSuit ? suits.find((s) => s.type === leadSuit) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 pointer-events-none">
      {/* 
         Removed the full-screen backdrop div.
         The container is pointer-events-none so clicks pass through to the table.
      */}

      <div className="relative pointer-events-auto w-full max-w-xs md:max-w-sm bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(var(--tg-viewport-height,100dvh)-var(--tg-viewport-safe-area-inset-top,0px)-var(--tg-viewport-safe-area-inset-bottom,0px))] overflow-y-auto">
        {/* Header - Compact on mobile */}
        <div className="p-3 md:p-6 text-center border-b border-slate-800 relative">
          {step === 'suit' && (
            <button
              onClick={() => setStep('option')}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs md:text-base"
            >
              ← {t('game.joker.back')}
            </button>
          )}
          <h2 className="text-lg md:text-2xl font-bold text-white">
            {step === 'option' ? t('game.joker.ability') : t('game.joker.selectSuit')}
          </h2>
          <div className="flex flex-col items-center mt-0.5 md:mt-1">
            <span className="text-slate-400 text-xs md:text-sm">
              {step === 'option'
                ? t('game.joker.chooseHow')
                : t('game.joker.forRequest', {
                    request:
                      selectedOption === JokerOption.High
                        ? t('game.joker.highRequest')
                        : t('game.joker.lowRequest'),
                  })}
            </span>
            {leadSuitInfo && step === 'option' && (
              <span className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1 flex items-center gap-1">
                {t('game.joker.lead')}:{' '}
                <span className={leadSuitInfo.color}>{leadSuitInfo.symbol}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content - Compact layout for mobile landscape */}
        <div className="p-2 md:p-6">
          {step === 'option' ? (
            <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 md:gap-3">
              {options.map((opt) => {
                const isDisabled = opt.leadingOnly !== isLeading;

                return (
                  <button
                    key={opt.id}
                    onClick={() => !isDisabled && handleOptionSelect(opt.id)}
                    disabled={isDisabled}
                    className={`
                      flex items-center p-2 md:p-4 rounded-lg md:rounded-xl border transition-all duration-200 text-left group
                      ${
                        isDisabled
                          ? 'opacity-30 bg-slate-900 border-slate-800 cursor-not-allowed saturate-0'
                          : `hover:bg-slate-800 hover:border-slate-600 ${opt.color}`
                      }
                    `}
                  >
                    <span className="text-xl md:text-3xl mr-2 md:mr-4 group-hover:scale-110 transition-transform">
                      {opt.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs md:text-lg text-white truncate">
                        {opt.label}
                      </div>
                      <div className="text-[9px] md:text-xs opacity-70 uppercase tracking-wider truncate">
                        {opt.subLabel}
                      </div>
                    </div>
                    {!isDisabled && (
                      <div className="ml-1 md:ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hidden md:block">
                        →
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-4">
              {suits.map((suit) => (
                <button
                  key={suit.type}
                  onClick={() => handleSuitSelect(suit.type)}
                  className="flex flex-col items-center justify-center p-3 md:p-6 rounded-lg md:rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200"
                >
                  <span className={`text-3xl md:text-5xl mb-1 md:mb-2 ${suit.color}`}>
                    {suit.symbol}
                  </span>
                  <span className="text-[9px] md:text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {suit.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
