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
          <circle cx="12" cy="7.5" r="4" />
          <circle cx="8" cy="12.5" r="4" />
          <circle cx="16" cy="12.5" r="4" />
          <path d="M11 14h2v5h3l-4 5-4-5h3z" />
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
