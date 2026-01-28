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

  // Optimized overlap for new card width (10% overlap roughly)
  // Cards are roughly 90px wide on mobile. 10% overlap = -9px.
  // But CSS transform translateX is relative to element width.
  // We use fixed pixels here. Let's try -10px for tight stack or -15px.
  const baseOverlap = isMobileLandscape ? -10 : -15;
  const overlap = totalCards > 8 ? baseOverlap - 5 : baseOverlap;

  // Height based on card size
  const heightClass = isMobileLandscape ? 'h-32' : 'h-64';

  return (
    <div
      className={`
        relative flex justify-center items-end ${heightClass} w-full perspective-[1000px]
        ${className}
      `}
    >
      {cards.map((card, index) => {
        const offsetFromCenter = index - centerIndex;

        // Fan calculations
        const rotateDeg = offsetFromCenter * 3; // 3 degree spread per card
        // Gentle arc
        const translateY = Math.abs(offsetFromCenter) * (isMobileLandscape ? 2 : 3);
        const translateX = offsetFromCenter * 2;

        const canPlay = isPlayable(card);
        const isInteractable = !disabled && canPlay;
        const validationMessage =
          !canPlay && !disabled && getValidationMessage ? getValidationMessage(card) : undefined;

        return (
          <div
            key={card.id}
            className={`
              transition-all duration-300 ease-out origin-bottom 
              ${isInteractable ? 'hover:z-50 hover:scale-110 cursor-pointer' : 'cursor-default'} 
              opacity-100 grayscale-0
              ${!canPlay && !disabled ? 'brightness-90' : ''} 
              ${isInteractable && isMobileLandscape ? 'hover:-translate-y-4' : ''}
              ${isInteractable && !isMobileLandscape ? 'hover:-translate-y-10' : ''}
              group/card relative
            `}
            style={{
              marginLeft: index === 0 ? 0 : `${overlap}px`,
              transform: `translateX(${translateX}px) rotate(${rotateDeg}deg) translateY(${translateY}px)`,
              zIndex: index,
            }}
          >
            {validationMessage && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-40 bg-slate-900/95 backdrop-blur text-white text-[10px] text-center p-2 rounded-lg border border-red-500/50 shadow-xl opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none z-[100]">
                {validationMessage}
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 rotate-45 border-r border-b border-red-500/50" />
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
                shadow-2xl
                ${isInteractable ? 'hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]' : ''}
              `}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Hand;
