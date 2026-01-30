import React from 'react';
import { Suit, Card as CardType } from '@joker/shared';
import Card from '../Card';
import { SuitIcon } from '../SuitIcon';
import { CardSize } from './types';

export interface TrumpIndicatorProps {
  trump: Suit | null;
  trumpCard?: CardType | null;
  isJokerTrump?: boolean;
  tableCardSize: CardSize;
}

export const TrumpIndicator: React.FC<TrumpIndicatorProps> = ({
  trump,
  trumpCard,
  isJokerTrump = false,
  tableCardSize,
}) => {
  // Only render if there's a trump or joker-as-trump
  if (!trump && !trumpCard && !isJokerTrump) return null;

  return (
    <div className="absolute top-[18%] left-[10%] z-20 flex flex-col items-center pointer-events-none transform rotate-[15deg]">
      <div className="relative">
        {/* Deck Representation (Underneath) */}
        <div className="absolute -top-1 -left-1 w-full h-full bg-[#8b0000] rounded-lg border border-[#5a0000] shadow-sm transform -rotate-2" />
        <div className="absolute -top-0.5 -left-0.5 w-full h-full bg-[#8b0000] rounded-lg border border-[#5a0000] shadow-sm transform -rotate-1" />

        {/* The Trump Card - Matches Table Card Style exactly */}
        {trumpCard ? (
          <div className="relative transform rotate-90 origin-center shadow-xl">
            <Card card={trumpCard} size={tableCardSize} className="border-none shadow-2xl" />
          </div>
        ) : trump ? (
          /* Fallback Suit Icon if card not visible (9-card round) */
          <div className="w-12 h-16 md:w-16 md:h-24 bg-slate-900/80 backdrop-blur-sm rounded-lg border-2 border-yellow-500/50 flex flex-col items-center justify-center shadow-xl">
            <SuitIcon
              suit={trump}
              className={`w-8 h-8 md:w-10 md:h-10 ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-500' : 'text-white'}`}
            />
            <span className="text-[8px] md:text-[10px] text-yellow-500 font-bold uppercase mt-1 tracking-wider">
              Trump
            </span>
          </div>
        ) : (
          /* No Trump (Joker) */
          <div className="w-12 h-16 md:w-16 md:h-24 bg-slate-900/80 backdrop-blur-sm rounded-lg border-2 border-purple-500/50 flex flex-col items-center justify-center shadow-xl">
            <span className="text-xl md:text-2xl">🃏</span>
            <span className="text-[8px] md:text-[10px] text-purple-300 font-bold uppercase mt-1 tracking-wider">
              No Trump
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrumpIndicator;
