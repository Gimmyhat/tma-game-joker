import React from 'react';
import { Suit } from '@joker/shared';

interface SuitIconProps {
  suit: Suit;
  className?: string;
}

export const SuitIcon: React.FC<SuitIconProps> = ({ suit, className }) => {
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
          {/* Fixed Clubs path */}
          <path d="M21.9 16.5c0-2.3-1.8-4.2-4.1-4.4-.3-1.7-1.3-3.1-2.7-4.1.7-1.1 1.1-2.3 1.1-3.6 0-3.3-2.7-6-6-6s-6 2.7-6 6c0 1.3.4 2.5 1.1 3.6-1.4.9-2.4 2.3-2.7 4.1-2.3.2-4.1 2.1-4.1 4.4 0 2.5 2 4.5 4.5 4.5.6 0 1.2-.1 1.7-.3.5.9 1.1 1.7 1.7 2.3H8v1h8v-1h-1.4c.7-.6 1.2-1.4 1.7-2.3.5.2 1.1.3 1.7.3 2.5 0 4.5-2 4.5-4.5z" />
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
