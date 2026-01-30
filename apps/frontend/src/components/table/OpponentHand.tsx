import React from 'react';
import Card from '../Card';
import { Position } from './types';

export interface OpponentHandProps {
  position: Position;
  cardsPerPlayer: number;
}

export const OpponentHand: React.FC<OpponentHandProps> = ({ position, cardsPerPlayer }) => {
  // Hero positions are handled separately
  if (position === 'bottom-left' || position === 'bottom-center') return null;

  // Calculate position for cards relative to viewport edge
  let containerClass = '';
  let cardRotation = 0;

  switch (position) {
    case 'top-left':
      containerClass = '-top-12 left-20 rotate-180';
      cardRotation = 180;
      break;
    case 'top-right':
      containerClass = '-top-12 right-20 rotate-180';
      cardRotation = 180;
      break;
    case 'top-center':
      containerClass = '-top-10 left-1/2 -translate-x-1/2 rotate-180';
      cardRotation = 180;
      break;
    case 'bottom-right':
      containerClass = 'bottom-32 -right-12 -rotate-90';
      cardRotation = -90;
      break;
    case 'left-center':
      containerClass = 'top-1/2 -translate-y-1/2 -left-10 rotate-90';
      cardRotation = 90;
      break;
    case 'right-center':
      containerClass = 'top-1/2 -translate-y-1/2 -right-10 -rotate-90';
      cardRotation = -90;
      break;
    default:
      return null;
  }

  // Just show a stack representation (3 cards fanned slightly)
  const cardCount = Math.min(cardsPerPlayer, 5);
  if (cardCount <= 0) return null;

  return (
    <div className={`absolute ${containerClass} z-20 pointer-events-none`}>
      {Array.from({ length: Math.min(3, cardCount) }).map((_, i) => (
        <div
          key={i}
          className="absolute shadow-2xl"
          style={{
            left: i * 4,
            top: i * 0,
            transform: `rotate(${cardRotation + i * 2}deg)`,
            zIndex: i,
          }}
        >
          <Card card={undefined} faceDown size="xs" className="border-2 border-white/10" />
        </div>
      ))}
      {/* Count Badge */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 whitespace-nowrap">
        {cardsPerPlayer}
      </div>
    </div>
  );
};

export default OpponentHand;
