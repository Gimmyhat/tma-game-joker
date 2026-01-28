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
}) => {
  const { t } = useTranslation();
  const [selectedBet, setSelectedBet] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedBet(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBetClick = (bet: number) => {
    setSelectedBet(bet);
    // Instant feedback then submit
    setTimeout(() => {
      onBet(bet);
    }, 300); // 300ms delay to see the active state
  };

  const bets = Array.from({ length: maxBet + 1 }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-transparent pointer-events-none">
      {/* 40% smaller: max-w reduced from 300 to 220, padding reduced */}
      <div className="relative w-[80%] max-w-[220px] bg-white text-slate-900 rounded-[1.2rem] shadow-2xl overflow-hidden transform scale-100 animate-in zoom-in-95 duration-300 pointer-events-auto border border-white/20 origin-center">
        {/* Header */}
        <div className="pt-4 px-4 pb-2 text-center">
          <h2 className="text-base font-bold text-slate-900 mb-0.5">
            {t('game.makeBet', 'Place Your Bet')}
          </h2>
          <div className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-2">
            <span>
              {t('game.round', 'Round')} {roundNumber}
            </span>
            {forbiddenBet !== undefined && (
              <span className="text-red-500 font-bold text-[9px] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                🚫 {forbiddenBet}
              </span>
            )}
          </div>
        </div>

        {/* Numpad Grid */}
        <div className="p-3 pb-4">
          <div className="grid grid-cols-4 gap-1.5">
            {bets.map((bet) => {
              const isForbidden = bet === forbiddenBet;
              const isSelected = selectedBet === bet;

              return (
                <button
                  key={bet}
                  disabled={isForbidden}
                  onClick={() => handleBetClick(bet)}
                  className={`
                      aspect-square rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-200
                      ${
                        isForbidden
                          ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-slate-900 text-white shadow-lg scale-105 z-10'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-95'
                      }
                   `}
                >
                  {bet}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
