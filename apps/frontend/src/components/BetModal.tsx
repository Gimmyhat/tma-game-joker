import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface BetModalProps {
  isOpen: boolean;
  onBet: (amount: number) => void;
  maxBet: number;
  forbiddenBet?: number;
  roundNumber: number;
  cardsInHand?: number;
  otherPlayersBetsSum?: number;
}

export const BetModal: React.FC<BetModalProps> = ({
  isOpen,
  onBet,
  maxBet,
  forbiddenBet,
  roundNumber,
  cardsInHand,
}) => {
  const { t } = useTranslation();
  const [selectedBet, setSelectedBet] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedBet(null);
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleConfirm = () => {
    if (selectedBet !== null) {
      onBet(selectedBet);
    }
  };

  const bets = Array.from({ length: maxBet + 1 }, (_, i) => i);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 
         Removed the full-screen backdrop div entirely.
         The container is pointer-events-none so clicks pass through to the table.
      */}

      {/* Modal Content - Floating Panel Style */}
      <div
        className={`
          pointer-events-auto
          relative w-[90%] max-w-[320px] mx-auto 
          bg-slate-900/95 backdrop-blur-sm 
          border border-white/10 
          rounded-2xl shadow-2xl 
          overflow-hidden 
          transform transition-all duration-300 ease-out 
          ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
        `}
      >
        {/* Compact Header */}
        <div className="bg-white/5 py-3 px-4 text-center border-b border-white/5">
          <h2 className="text-lg font-bold text-white leading-none mb-1">{t('game.makeBet')}</h2>
          <div className="flex justify-center space-x-3 text-xs text-slate-400 font-medium">
            <span>
              {t('game.round')} {roundNumber}
            </span>
            {cardsInHand !== undefined && (
              <>
                <span className="text-slate-600">•</span>
                <span>
                  {cardsInHand} {t('game.cards')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Dealer Restriction Info - Ultra Compact */}
          {forbiddenBet !== undefined && (
            <div className="mb-4 flex items-center justify-center gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded-lg py-1.5 px-3 text-red-300">
              <span className="font-bold text-red-400 uppercase tracking-wider text-[10px]">
                {t('game.dealerRestriction')}:
              </span>
              <span>{forbiddenBet}</span>
            </div>
          )}

          {/* Bet Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {bets.map((bet) => {
              const isForbidden = bet === forbiddenBet;
              const isSelected = selectedBet === bet;

              return (
                <button
                  key={bet}
                  disabled={isForbidden}
                  onClick={() => setSelectedBet(bet)}
                  className={`
                    relative h-10 w-full rounded-lg text-base font-bold transition-all duration-200
                    flex items-center justify-center
                    ${
                      isForbidden
                        ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                        : isSelected
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                >
                  {bet}
                  {isForbidden && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-50">
                      <div className="w-1/2 h-0.5 bg-red-500 rotate-45 absolute rounded-full" />
                      <div className="w-1/2 h-0.5 bg-red-500 -rotate-45 absolute rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleConfirm}
            disabled={selectedBet === null}
            className={`
              w-full py-3 rounded-xl font-bold text-base tracking-wide transition-all duration-200
              shadow-lg
              ${
                selectedBet !== null
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }
            `}
          >
            {t('game.confirmBet')}
          </button>
        </div>
      </div>
    </div>
  );
};
