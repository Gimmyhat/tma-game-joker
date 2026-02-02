import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Player, Rank, Suit } from '@joker/shared';
import Card from '../Card';
import {
  Position,
  CardSize,
  TuzovanieSequenceItem,
  TUZOVANIE_POSITIONS,
  hashString,
} from './types';

export interface TuzovanieAnimationProps {
  players: Player[];
  tuzovanieCards: CardType[][] | null;
  tuzovanieSequence: TuzovanieSequenceItem[] | null;
  tableCardSize: CardSize;
  getPlayerPosition: (playerId: string) => Position;
}

export const TuzovanieAnimation: React.FC<TuzovanieAnimationProps> = ({
  players,
  tuzovanieCards,
  tuzovanieSequence,
  tableCardSize,
  getPlayerPosition,
}) => {
  // Generate a stable random center card once
  const centerCard = useMemo(() => {
    const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
    // Exclude Aces to avoid confusion with the "Dealer" ace?
    // Or include them? A random card is a random card. Let's include all standard ranks except maybe the highest/lowest if we want specific aesthetics.
    // Let's stick to standard ranks 6-K for the center card to avoid "Is this the dealer ace?" confusion.
    const ranks = [
      Rank.Six,
      Rank.Seven,
      Rank.Eight,
      Rank.Nine,
      Rank.Ten,
      Rank.Jack,
      Rank.Queen,
      Rank.King,
    ];

    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];

    return {
      id: 'center-deck-random',
      suit: randomSuit,
      rank: randomRank,
      type: 'standard',
    } as CardType;
  }, []);

  // Prepare the sequence
  const sequence = useMemo(() => {
    let seq: TuzovanieSequenceItem[] = [];

    if (tuzovanieSequence) {
      seq = [...tuzovanieSequence];
    } else if (tuzovanieCards) {
      // Fallback generation
      const maxRounds = Math.max(...tuzovanieCards.map((h) => h.length));
      let dealIndex = 0;
      for (let r = 0; r < maxRounds; r++) {
        for (let i = 0; i < players.length; i++) {
          if (tuzovanieCards[i] && tuzovanieCards[i][r]) {
            seq.push({
              card: tuzovanieCards[i][r],
              playerId: players[i].id,
              dealIndex: dealIndex++,
            });
          }
        }
      }
    }

    if (!seq.length) return null;

    // Ensure "Center Deck" is present at the start
    if (!seq.some((item) => item.playerId === 'center-deck')) {
      seq.unshift({
        card: centerCard,
        playerId: 'center-deck',
        dealIndex: -1,
      });
    }

    return seq;
  }, [tuzovanieSequence, tuzovanieCards, players, centerCard]);

  if (!sequence) return null;

  return (
    <>
      {sequence.map(({ card, playerId, dealIndex }) => {
        const isDeck = playerId === 'center-deck';
        // If it's the deck, throw it immediately (delay 0).
        // If it's a card, wait for deck animation to finish (approx 0.8s) + stagger based on dealIndex.
        const animDelay = isDeck ? 0 : 0.8 + Math.max(0, dealIndex) * 0.34;
        const duration = 0.6;

        // Special case for the "Center Deck" card
        if (isDeck) {
          const hash = hashString(card.id);
          const randomAngle = (hash % 20) - 10;

          return (
            <motion.div
              key="tuz-center-deck"
              initial={{ scale: 1.5, opacity: 0, x: '-50%', y: '-150%', rotate: randomAngle }}
              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%', rotate: randomAngle }}
              transition={{
                delay: animDelay,
                duration,
                type: 'spring',
                stiffness: 120,
                damping: 12,
              }}
              className="absolute z-0"
            >
              <Card card={card} size={tableCardSize} className="shadow-xl" />
            </motion.div>
          );
        }

        const pos = getPlayerPosition(playerId);
        const isAce = card.type === 'standard' && card.rank === Rank.Ace;
        const t = TUZOVANIE_POSITIONS[pos] || { x: 0, y: 0, rotate: 0 };
        const hash = hashString(card.id);
        const randomAngle = (hash % 20) - 10;

        return (
          <motion.div
            key={`tuz-${playerId}-${card.id}`}
            initial={{ x: '-50%', y: '-50%', scale: 0.2, opacity: 0, rotate: 0 }}
            animate={{
              x: `calc(${t.x}px - 50%)`,
              y: `calc(${t.y}px - 50%)`,
              scale: 1,
              opacity: 1,
              rotate: t.rotate + randomAngle,
            }}
            transition={{
              delay: animDelay,
              duration,
              type: 'spring',
              stiffness: 100,
              damping: 15,
            }}
            className="absolute z-50 flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="relative">
              <Card
                card={card}
                size={tableCardSize}
                className={`shadow-2xl ${
                  isAce
                    ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black/50'
                    : 'border-none'
                }`}
              />

              {/* Dealer Badge - Show if Ace */}
              {isAce && (
                <motion.div
                  initial={{ opacity: 0, y: 0, scale: 0 }}
                  animate={{ opacity: 1, y: 45, scale: 1 }}
                  transition={{ delay: animDelay + 0.15, type: 'spring' }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50"
                >
                  <div className="bg-gradient-to-r from-yellow-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg whitespace-nowrap border border-yellow-300">
                    Dealer
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </>
  );
};

export default TuzovanieAnimation;
