import React, { CSSProperties } from 'react';
import { Card as CardType, Suit, Rank } from '@joker/shared';
import { SuitIcon } from './SuitIcon';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
    xs: 'w-10 h-14 text-[8px]',
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
