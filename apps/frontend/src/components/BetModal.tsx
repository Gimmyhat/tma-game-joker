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
  otherPlayersBetsSum,
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
      className={`fixed inset-0 z-[60] flex items-center justify-center pb-24 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop - reduced opacity for visibility */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent backdrop-blur-[1px]"
        onClick={() => {}}
      />

      {/* Centered Content */}
      <div
        className={`relative w-[96%] max-w-md mx-auto bg-slate-900 border border-slate-700/80 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden transform transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 pt-7 pb-4 px-6 text-center border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-1">{t('game.makeBet')}</h2>
          <div className="flex justify-center space-x-4 text-sm text-slate-400">
            <span>
              {t('game.round')} {roundNumber}
            </span>
            {cardsInHand !== undefined && (
              <>
                <span>•</span>
                <span>
                  {cardsInHand} {t('game.cards')}
                </span>
              </>
            )}
          </div>

          {/* Dealer Restriction Info */}
          {forbiddenBet !== undefined && (
            <div className="mt-3 bg-red-900/20 border border-red-500/20 rounded-lg p-2 text-xs text-red-200">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="font-bold uppercase tracking-wider text-red-400">
                  {t('game.dealerRestriction')}
                </span>
              </div>
              <p>
                {t('game.dealerRestrictionText')}{' '}
                <span className="font-bold text-white">{forbiddenBet}</span>.
              </p>
              {otherPlayersBetsSum !== undefined && cardsInHand !== undefined && (
                <p className="mt-1 text-red-300/70">
                  {t('game.dealerRestrictionDetail', {
                    otherBets: otherPlayersBetsSum,
                    totalCards: cardsInHand,
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-4 gap-3 mb-6">
            {bets.map((bet) => {
              const isForbidden = bet === forbiddenBet;
              const isSelected = selectedBet === bet;

              return (
                <button
                  key={bet}
                  disabled={isForbidden}
                  onClick={() => setSelectedBet(bet)}
                  className={`
                    relative aspect-square rounded-xl text-lg font-bold transition-all duration-200
                    flex items-center justify-center
                    ${
                      isForbidden
                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-transparent'
                        : isSelected
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105 border-transparent'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 hover:border-slate-600'
                    }
                  `}
                >
                  {bet}
                  {isForbidden && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3/4 h-0.5 bg-red-500/50 rotate-45 absolute rounded-full" />
                      <div className="w-3/4 h-0.5 bg-red-500/50 -rotate-45 absolute rounded-full" />
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
              w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-200
              ${
                selectedBet !== null
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
