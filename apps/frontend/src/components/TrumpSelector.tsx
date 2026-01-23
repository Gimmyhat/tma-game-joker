import React, { useState, useEffect } from 'react';
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
  const [selectedSuit, setSelectedSuit] = useState<Suit | null | 'none'>('none');

  useEffect(() => {
    if (isOpen) {
      // If Joker is trump, default to No Trump is natural, but we explicitly set it
      setSelectedSuit('none');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const suits = [
    { type: Suit.Hearts, color: 'text-red-500', label: 'Hearts' },
    { type: Suit.Diamonds, color: 'text-red-500', label: 'Diamonds' },
    { type: Suit.Clubs, color: 'text-slate-200', label: 'Clubs' },
    { type: Suit.Spades, color: 'text-slate-200', label: 'Spades' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">Choose Trump</h2>
          <p className="text-slate-400 text-sm mt-1">Select a suit or play No Trump</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {suits.map((suit) => (
              <button
                key={suit.type}
                onClick={() => setSelectedSuit(suit.type)}
                className={`
                  flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200
                  ${
                    selectedSuit === suit.type
                      ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
                  }
                `}
              >
                <SuitIcon suit={suit.type} className={`w-16 h-16 mb-2 ${suit.color}`} />
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${selectedSuit === suit.type ? 'text-amber-500' : 'text-slate-400'}`}
                >
                  {suit.label}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setSelectedSuit(null)}
            className={`
              w-full p-4 rounded-xl border-2 font-bold text-lg transition-all duration-200 flex items-center justify-center
              ${
                selectedSuit === null
                  ? 'border-amber-500 bg-amber-500/10 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
              }
            `}
          >
            <span className="mr-2">Ø</span>
            {isJokerTrump ? 'No Trump (Joker Revealed)' : 'No Trump'}
          </button>

          <button
            onClick={() => onSelect(selectedSuit === 'none' ? null : selectedSuit)}
            disabled={selectedSuit === 'none'}
            className={`
              w-full py-4 mt-2 rounded-xl font-bold text-lg tracking-wide transition-all duration-200
              ${
                selectedSuit !== 'none'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
