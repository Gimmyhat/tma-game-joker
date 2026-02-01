import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Player, Rank } from '@joker/shared';
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
  let sequence = tuzovanieSequence;

  // Fallback if sequence is missing but we have cards
  if (!sequence && tuzovanieCards) {
    const fallbackSeq: TuzovanieSequenceItem[] = [];
    const maxRounds = Math.max(...tuzovanieCards.map((h) => h.length));
    let dealIndex = 0;
    for (let r = 0; r < maxRounds; r++) {
      for (let i = 0; i < players.length; i++) {
        if (tuzovanieCards[i] && tuzovanieCards[i][r]) {
          fallbackSeq.push({
            card: tuzovanieCards[i][r],
            playerId: players[i].id,
            dealIndex: dealIndex++,
          });
        }
      }
    }
    sequence = fallbackSeq;
  }

  if (!sequence) return null;

  return (
    <>
      {sequence.map(({ card, playerId, dealIndex }) => {
        const animDelay = dealIndex * 0.34;
        const duration = 0.6;

        // Special case for the "Center Deck" card
        if (playerId === 'center-deck') {
          // Add messy randomness for the deck too
          const hash = hashString(card.id);
          const randomAngle = (hash % 20) - 10;

          return (
            <motion.div
              key="tuz-center-deck"
              initial={{ scale: 1.5, opacity: 0, y: -50, rotate: randomAngle }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: randomAngle }}
              transition={{
                delay: animDelay,
                duration,
                type: 'spring',
                stiffness: 120,
                damping: 12,
              }}
              className="absolute z-0"
            >
              <Card card={undefined} faceDown size={tableCardSize} className="shadow-xl" />
            </motion.div>
          );
        }

        const pos = getPlayerPosition(playerId);
        const isAce = card.type === 'standard' && card.rank === Rank.Ace;

        const t = TUZOVANIE_POSITIONS[pos] || { x: 0, y: 0, rotate: 0 };

        // Add messy randomness (+/- 10 degrees)
        const hash = hashString(card.id);
        const randomAngle = (hash % 20) - 10;

        return (
          <motion.div
            key={`tuz-${playerId}-${card.id}`}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
            animate={{
              x: t.x,
              y: t.y,
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
                className={`shadow-2xl ${isAce ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black/50' : 'border-none'}`}
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
