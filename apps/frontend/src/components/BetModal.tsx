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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-[90%] max-w-[340px] bg-white text-slate-900 rounded-[2rem] shadow-2xl overflow-hidden transform scale-100 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="pt-8 px-6 pb-2 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {t('game.makeBet', 'Place Your Bet')}
          </h2>
          <div className="text-sm text-slate-500 font-medium flex items-center justify-center gap-2">
            <span>
              {t('game.round', 'Round')} {roundNumber}
            </span>
            {forbiddenBet !== undefined && (
              <span className="text-red-500 font-bold text-xs bg-red-50 border border-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                🚫 {forbiddenBet}
              </span>
            )}
          </div>
        </div>

        {/* Numpad Grid */}
        <div className="p-6">
          <div className="grid grid-cols-4 gap-3">
            {bets.map((bet) => {
              const isForbidden = bet === forbiddenBet;
              const isSelected = selectedBet === bet;

              return (
                <button
                  key={bet}
                  disabled={isForbidden}
                  onClick={() => setSelectedBet(bet)}
                  className={`
                      aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-200
                      ${
                        isForbidden
                          ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-slate-900 text-white shadow-xl scale-110 z-10'
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
        <div className="p-6 pt-0">
          <button
            onClick={handleConfirm}
            disabled={selectedBet === null}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300
              flex items-center justify-center gap-2
              ${
                selectedBet !== null
                  ? 'bg-[#1a5c32] text-white shadow-lg shadow-green-900/20 hover:bg-[#144a28] active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {t('game.confirm', 'CONFIRM')}
            {selectedBet !== null && (
              <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-sm font-mono backdrop-blur-sm">
                {selectedBet}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
