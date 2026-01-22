import React, { useState, useEffect } from 'react';
import { JokerOption, Suit } from '@joker/shared';

interface JokerOptionModalProps {
  isOpen: boolean;
  onSelect: (option: JokerOption, requestedSuit?: Suit) => void;
  leadSuit?: Suit;
}

export const JokerOptionModal: React.FC<JokerOptionModalProps> = ({
  isOpen,
  onSelect,
  leadSuit,
}) => {
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

  const options = [
    {
      id: JokerOption.High,
      label: 'High Request',
      subLabel: 'Request Highest Card',
      icon: '⬆️',
      color: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400',
    },
    {
      id: JokerOption.Low,
      label: 'Low Request',
      subLabel: 'Request Lowest Card',
      icon: '⬇️',
      color: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400',
    },
    {
      id: JokerOption.Top,
      label: 'Take High',
      subLabel: 'Beats Highest',
      icon: '👑',
      color: 'bg-amber-500/10 border-amber-500/50 text-amber-400',
    },
    {
      id: JokerOption.Bottom,
      label: 'Take Low',
      subLabel: 'Beats Lowest',
      icon: '🛡️',
      color: 'bg-purple-500/10 border-purple-500/50 text-purple-400',
    },
  ];

  const suits = [
    { type: Suit.Hearts, symbol: '♥', color: 'text-red-500', label: 'Hearts' },
    { type: Suit.Diamonds, symbol: '♦', color: 'text-red-500', label: 'Diamonds' },
    { type: Suit.Clubs, symbol: '♣', color: 'text-slate-200', label: 'Clubs' },
    { type: Suit.Spades, symbol: '♠', color: 'text-slate-200', label: 'Spades' },
  ];

  const leadSuitInfo = leadSuit ? suits.find((s) => s.type === leadSuit) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-800 relative">
          {step === 'suit' && (
            <button
              onClick={() => setStep('option')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              ← Back
            </button>
          )}
          <h2 className="text-2xl font-bold text-white">
            {step === 'option' ? 'Joker Ability' : 'Select Suit'}
          </h2>
          <div className="flex flex-col items-center mt-1">
            <span className="text-slate-400 text-sm">
              {step === 'option'
                ? 'Choose how to play the Joker'
                : `For ${selectedOption === JokerOption.High ? 'Highest' : 'Lowest'} Request`}
            </span>
            {leadSuitInfo && step === 'option' && (
              <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                Lead: <span className={leadSuitInfo.color}>{leadSuitInfo.symbol}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'option' ? (
            <div className="grid gap-3">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`
                    flex items-center p-4 rounded-xl border transition-all duration-200 text-left group
                    hover:bg-slate-800 hover:border-slate-600
                    ${opt.color}
                  `}
                >
                  <span className="text-3xl mr-4 group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </span>
                  <div>
                    <div className="font-bold text-lg text-white">{opt.label}</div>
                    <div className="text-xs opacity-70 uppercase tracking-wider">
                      {opt.subLabel}
                    </div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                    →
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {suits.map((suit) => (
                <button
                  key={suit.type}
                  onClick={() => handleSuitSelect(suit.type)}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200"
                >
                  <span className={`text-5xl mb-2 ${suit.color}`}>{suit.symbol}</span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
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
