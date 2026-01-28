import React from 'react';
import { Card as CardType } from '@joker/shared';
import Card from './Card';
import { useResponsiveCards } from '../hooks';

interface HandProps {
  cards: CardType[];
  onCardClick?: (card: CardType) => void;
  playableCards?: CardType[];
  className?: string;
  disabled?: boolean;
  getValidationMessage?: (card: CardType) => string | undefined;
}

export const Hand: React.FC<HandProps> = ({
  cards = [],
  onCardClick,
  playableCards,
  className = '',
  disabled = false,
  getValidationMessage,
}) => {
  const { handCardSize, isMobileLandscape } = useResponsiveCards();

  const isPlayable = (card: CardType) => {
    if (!playableCards) return true;
    return playableCards.some((c) => c.id === card.id);
  };

  // Calculate arc parameters
  const totalCards = cards.length;
  const centerIndex = (totalCards - 1) / 2;

  // Tighter overlap for more cards, even tighter on mobile
  const baseOverlap = isMobileLandscape ? -35 : -40;
  const overlap =
    totalCards > 8 ? baseOverlap - 15 : totalCards > 5 ? baseOverlap - 5 : baseOverlap;

  // Height based on card size
  const heightClass = isMobileLandscape ? 'h-24' : 'h-48';

  return (
    <div
      className={`
        relative flex justify-center items-end ${heightClass} w-full perspective-[1000px]
        ${className}
      `}
    >
      {cards.map((card, index) => {
        const offsetFromCenter = index - centerIndex;

        // More dramatic fan on desktop, subtle on mobile
        const rotateScale = isMobileLandscape ? 2 : 4;
        const rotateDeg = offsetFromCenter * rotateScale;
        const translateY = Math.abs(offsetFromCenter) * (isMobileLandscape ? 4 : 8);
        const translateX = offsetFromCenter * (isMobileLandscape ? 1 : 2);

        const canPlay = isPlayable(card);
        const isInteractable = !disabled && canPlay;
        const validationMessage =
          !canPlay && !disabled && getValidationMessage ? getValidationMessage(card) : undefined;

        return (
          <div
            key={card.id}
            className={`transition-all duration-300 ease-out origin-bottom hover:z-50 ${isMobileLandscape ? 'hover:scale-105' : 'hover:scale-110'} group/card relative`}
            style={{
              marginLeft: index === 0 ? 0 : `${overlap}px`,
              transform: `translateX(${translateX}px) rotate(${rotateDeg}deg) translateY(${translateY}px)`,
              zIndex: index,
            }}
          >
            {validationMessage && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-32 bg-slate-900/95 backdrop-blur text-white text-[10px] text-center p-2 rounded-lg border border-red-500/30 shadow-xl opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none z-[100]">
                {validationMessage}
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 rotate-45 border-r border-b border-red-500/30" />
              </div>
            )}

            <Card
              card={card}
              size={handCardSize}
              playable={canPlay}
              disabled={!isInteractable}
              selected={false}
              onClick={() => isInteractable && onCardClick?.(card)}
              className={`
                shadow-xl 
                ${isInteractable ? `${isMobileLandscape ? 'hover:-translate-y-6' : 'hover:-translate-y-12'} cursor-pointer` : 'cursor-default opacity-60 saturate-50'}
              `}
              style={{
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
