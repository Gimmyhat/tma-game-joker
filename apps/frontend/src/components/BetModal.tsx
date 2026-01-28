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

  const handleConfirm = () => {
    if (selectedBet !== null) {
      onBet(selectedBet);
    }
  };

  const bets = Array.from({ length: maxBet + 1 }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-transparent pointer-events-none">
      <div className="relative w-[85%] max-w-[300px] bg-white text-slate-900 rounded-[1.5rem] shadow-2xl overflow-hidden transform scale-90 md:scale-100 animate-in zoom-in-95 duration-300 pointer-events-auto border border-white/20 origin-center">
        {/* Header */}
        <div className="pt-6 px-5 pb-2 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {t('game.makeBet', 'Place Your Bet')}
          </h2>
          <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
            <span>
              {t('game.round', 'Round')} {roundNumber}
            </span>
            {forbiddenBet !== undefined && (
              <span className="text-red-500 font-bold text-[10px] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                🚫 {forbiddenBet}
              </span>
            )}
          </div>
        </div>

        {/* Numpad Grid */}
        <div className="p-5">
          <div className="grid grid-cols-4 gap-2">
            {bets.map((bet) => {
              const isForbidden = bet === forbiddenBet;
              const isSelected = selectedBet === bet;

              return (
                <button
                  key={bet}
                  disabled={isForbidden}
                  onClick={() => setSelectedBet(bet)}
                  className={`
                      aspect-square rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-200
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

        {/* Footer Actions */}
        <div className="p-5 pt-0">
          <button
            onClick={handleConfirm}
            disabled={selectedBet === null}
            className={`
              w-full py-3 rounded-xl font-bold text-base tracking-wide transition-all duration-300
              flex items-center justify-center gap-2
              ${
                selectedBet !== null
                  ? 'bg-[#1a5c32] text-white shadow-md shadow-green-900/20 hover:bg-[#144a28] active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {t('game.confirm', 'CONFIRM')}
            {selectedBet !== null && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono backdrop-blur-sm">
                {selectedBet}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
