import React from 'react';
import { Card as CardType } from '@joker/shared';
import Card from './Card';

interface HandProps {
  cards: CardType[];
  onCardClick?: (card: CardType) => void;
  playableCards?: CardType[];
  className?: string;
  disabled?: boolean;
}

export const Hand: React.FC<HandProps> = ({
  cards = [],
  onCardClick,
  playableCards,
  className = '',
  disabled = false,
}) => {
  const isPlayable = (card: CardType) => {
    if (!playableCards) return true;
    return playableCards.some((c) => c.id === card.id);
  };

  // Calculate arc parameters
  const totalCards = cards.length;
  const centerIndex = (totalCards - 1) / 2;

  // Tighter overlap for more cards
  const overlap = totalCards > 8 ? -50 : totalCards > 5 ? -40 : -30;

  return (
    <div
      className={`
        relative flex justify-center items-end h-48 w-full perspective-[1000px]
        ${className}
      `}
    >
      {/* Hand Base Glow - Removed for classic look */}
      {/* <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-cyan-900/20 blur-3xl pointer-events-none" /> */}

      {cards.map((card, index) => {
        const offsetFromCenter = index - centerIndex;

        // More dramatic fan
        const rotateDeg = offsetFromCenter * 4;
        const translateY = Math.abs(offsetFromCenter) * 8; // Deeper arc
        const translateX = offsetFromCenter * 2; // Slight spread compensation

        const canPlay = isPlayable(card);
        const isInteractable = !disabled && canPlay;

        return (
          <div
            key={card.id}
            className="transition-all duration-300 ease-out origin-bottom hover:z-50 hover:scale-110"
            style={{
              marginLeft: index === 0 ? 0 : `${overlap}px`,
              transform: `translateX(${translateX}px) rotate(${rotateDeg}deg) translateY(${translateY}px)`,
              zIndex: index,
            }}
          >
            <Card
              card={card}
              size="lg" // Larger cards as requested
              playable={canPlay}
              disabled={!isInteractable}
              selected={false}
              onClick={() => isInteractable && onCardClick?.(card)}
              className={`
                shadow-xl 
                ${isInteractable ? 'hover:-translate-y-12 cursor-pointer' : 'cursor-default'}
              `}
              style={{
                // Subtle shadow instead of gradient mask
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Hand;
