import React, { CSSProperties } from 'react';
import { Card as CardType, Suit, Rank } from '@joker/shared';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  playable?: boolean;
  style?: CSSProperties;
}

const suitColors = {
  [Suit.Hearts]: 'text-red-600',
  [Suit.Diamonds]: 'text-red-600',
  [Suit.Clubs]: 'text-gray-900',
  [Suit.Spades]: 'text-gray-900',
};

const SuitIcon = ({ suit, className }: { suit: Suit; className?: string }) => {
  switch (suit) {
    case Suit.Hearts:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case Suit.Diamonds:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M19 12L12 22 5 12 12 2z" />
        </svg>
      );
    case Suit.Clubs:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2C9 2 7 4.5 7 7c0 1.1.9 2 2 2 0-2 2.5-4 5-4s5 2 5 4c1.1 0 2-.9 2-2 0-2.5-2-5-5-5zm0 10c-2.8 0-5 2.2-5 5 0 1.2.4 2.3 1.09 3.21L6 22h12l-2.09-1.79c.69-.91 1.09-2.01 1.09-3.21 0-2.8-2.2-5-5-5z" />
        </svg>
      );
    case Suit.Spades:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2C9 2 5 8 5 12c0 2.2 1.8 4 4 4 1.5 0 2.8-.8 3.5-2 .7 1.2 2 2 3.5 2 2.2 0 4-1.8 4-4 0-4-4-10-7-10zm0 15c-1.1 0-2 .9-2 2v3h4v-3c0-1.1-.9-2-2-2z" />
        </svg>
      );
    default:
      return null;
  }
};

const JokerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 19h-13L12 5.5zM12 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
  </svg>
);

const CardBack = () => (
  <div className="w-full h-full rounded-lg bg-red-900 overflow-hidden relative border border-white/20 shadow-inner">
    {/* Classic Pattern */}
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
        backgroundSize: '8px 8px',
      }}
    />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-yellow-500/50 flex items-center justify-center bg-red-950/40">
        <span className="text-yellow-500 font-serif font-bold text-xl">J</span>
      </div>
    </div>
  </div>
);

const getRankDisplay = (rank: Rank) => {
  switch (rank) {
    case Rank.Jack:
      return 'J';
    case Rank.Queen:
      return 'Q';
    case Rank.King:
      return 'K';
    case Rank.Ace:
      return 'A';
    default:
      return rank.toString();
  }
};

export const Card: React.FC<CardProps> = ({
  card,
  faceDown = false,
  onClick,
  size = 'md',
  selected = false,
  disabled = false,
  className = '',
  playable = false,
  style = {},
}) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs',
    md: 'w-24 h-36 text-base',
    lg: 'w-32 h-48 text-xl',
  };

  const baseClasses = `
    relative transition-all duration-300 ease-out transform
    rounded-xl cursor-pointer select-none font-serif
    ${sizeClasses[size]}
    ${
      selected
        ? '-translate-y-6 shadow-xl ring-2 ring-yellow-400 z-50'
        : 'hover:-translate-y-2 hover:shadow-lg'
    }
    ${disabled ? 'opacity-60 cursor-not-allowed grayscale' : ''}
    ${playable && !selected ? 'ring-1 ring-yellow-400/50' : ''}
    ${className}
  `;

  if (faceDown || !card) {
    return (
      <div className={`${baseClasses} bg-white`} onClick={onClick} style={style}>
        <CardBack />
      </div>
    );
  }

  const isJoker = card.type === 'joker';
  const colorClass = isJoker ? 'text-purple-600' : suitColors[card.suit];

  return (
    <div
      className={`${baseClasses} bg-white overflow-hidden border border-gray-300 shadow-sm`}
      onClick={!disabled ? onClick : undefined}
      style={style}
    >
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] pointer-events-none z-10" />

      {isJoker ? (
        <div
          className={`relative w-full h-full flex flex-col items-center justify-center ${colorClass}`}
        >
          <div className="absolute top-1 left-1 flex flex-col items-center">
            <span className="font-bold text-xs">JOKER</span>
            <JokerIcon className="w-3 h-3" />
          </div>
          <JokerIcon className="w-2/3 h-2/3 opacity-90" />
          <div className="absolute bottom-1 right-1 flex flex-col items-center rotate-180">
            <span className="font-bold text-xs">JOKER</span>
            <JokerIcon className="w-3 h-3" />
          </div>
        </div>
      ) : (
        <div className={`relative w-full h-full flex flex-col justify-between p-2 ${colorClass}`}>
          {/* Top Left */}
          <div className="flex flex-col items-center self-start">
            <span className="font-bold leading-none text-2xl">{getRankDisplay(card.rank)}</span>
            <SuitIcon suit={card.suit} className="w-4 h-4 mt-0.5" />
          </div>

          {/* Center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <SuitIcon suit={card.suit} className="w-full h-full scale-125" />
          </div>

          <div className="self-center z-0">
            <SuitIcon suit={card.suit} className="w-10 h-10 opacity-100" />
          </div>

          {/* Bottom Right */}
          <div className="flex flex-col items-center self-end rotate-180">
            <span className="font-bold leading-none text-2xl">{getRankDisplay(card.rank)}</span>
            <SuitIcon suit={card.suit} className="w-4 h-4 mt-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Card;
