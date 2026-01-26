import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType, Rank } from '@joker/shared';
import { useTranslation } from 'react-i18next';
import Card from './Card';

interface TuzovanieOverlayProps {
  cardsDealt: CardType[][];
  dealerIndex: number;
  onComplete?: () => void;
  myPlayerIndex?: number; // Optional: to rotate the view so "Me" is bottom
}

type Position = 'bottom' | 'left' | 'top' | 'right';

interface DealtCard {
  card: CardType;
  playerIndex: number;
  sequenceIndex: number;
  isAce: boolean;
}

export const TuzovanieOverlay: React.FC<TuzovanieOverlayProps> = ({
  cardsDealt,
  dealerIndex,
  onComplete,
  myPlayerIndex = 0,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(-1);
  const [showDealerBadge, setShowDealerBadge] = useState(false);

  // 1. Flatten the cards into a dealing sequence
  // Order: Player 0 -> 1 -> 2 -> 3 -> 0...
  const sequence = useMemo(() => {
    const seq: DealtCard[] = [];
    if (!cardsDealt || cardsDealt.length === 0) return seq;

    const maxCards = Math.max(...cardsDealt.map((h) => h?.length || 0));
    let seqIdx = 0;

    for (let round = 0; round < maxCards; round++) {
      for (let pIdx = 0; pIdx < 4; pIdx++) {
        const hand = cardsDealt[pIdx];
        if (hand && hand[round]) {
          const card = hand[round];
          const isAce = card.type === 'standard' && card.rank === Rank.Ace;
          seq.push({
            card,
            playerIndex: pIdx,
            sequenceIndex: seqIdx,
            isAce,
          });
          seqIdx++;
        }
      }
    }
    return seq;
  }, [cardsDealt]);

  // 2. Animation Loop
  useEffect(() => {
    if (sequence.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;

        // Stop if we reached the end
        if (next >= sequence.length) {
          clearInterval(interval);

          setTimeout(() => {
            setShowDealerBadge(true);
            if (onComplete) {
              setTimeout(onComplete, 3000); // Wait 3s after dealer reveal
            }
          }, 500);

          return prev;
        }
        return next;
      });
    }, 400); // Speed of dealing

    return () => clearInterval(interval);
  }, [sequence, onComplete]);

  // 3. Helper to map player index to visual position
  const getPosition = (pIndex: number): Position => {
    const relative = (pIndex - myPlayerIndex + 4) % 4;
    const positions: Position[] = ['bottom', 'left', 'top', 'right'];
    return positions[relative];
  };

  const getSlotStyle = (pos: Position): string => {
    switch (pos) {
      case 'bottom':
        return 'bottom-20 left-1/2 -translate-x-1/2';
      case 'left':
        return 'top-1/2 left-20 -translate-y-1/2';
      case 'top':
        return 'top-20 left-1/2 -translate-x-1/2';
      case 'right':
        return 'top-1/2 right-20 -translate-y-1/2';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-hidden font-serif">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)] pointer-events-none" />

      {/* Title */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 opacity-10 pointer-events-none">
        <span className="text-9xl font-black text-white tracking-tighter">
          {t('game.tuzovanie', 'TUZOVANIE')}
        </span>
      </div>

      {/* Center Deck */}
      <div className="relative z-10 w-24 h-36 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl flex items-center justify-center">
        <div className="w-20 h-32 border border-gray-600 rounded-lg bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20" />
        <span className="absolute text-gray-500 font-bold tracking-widest text-xs">DECK</span>
      </div>

      {/* Player Slots & Cards */}
      <AnimatePresence>
        {sequence.map((item) => {
          if (item.sequenceIndex > currentStep) return null;

          const pos = getPosition(item.playerIndex);
          const isWinner = showDealerBadge && item.playerIndex === dealerIndex && item.isAce;

          return (
            <motion.div
              key={`${item.playerIndex}-${item.card.id}`}
              className={`absolute ${getSlotStyle(pos)} z-20`}
              // Start from center (approximate inverse of slot position)
              initial={((): any => {
                switch (pos) {
                  case 'bottom':
                    return { y: -300, opacity: 0, scale: 0.5 };
                  case 'top':
                    return { y: 300, opacity: 0, scale: 0.5 };
                  case 'left':
                    return { x: 300, opacity: 0, scale: 0.5 };
                  case 'right':
                    return { x: -300, opacity: 0, scale: 0.5 };
                }
              })()}
              animate={{
                x: 0,
                y: 0,
                scale: isWinner ? 1.5 : 1,
                opacity: 1,
                rotate: isWinner ? 360 : 0,
                zIndex: isWinner ? 50 : 20 + item.sequenceIndex,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: 0.05,
              }}
            >
              <div className="relative group">
                <Card
                  card={item.card}
                  size={isWinner ? 'lg' : 'md'}
                  className={`shadow-xl ${isWinner ? 'ring-4 ring-yellow-400 shadow-yellow-900/50' : ''}`}
                />

                {/* Dealer Badge */}
                {isWinner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-4 py-1 rounded-full uppercase tracking-widest text-sm shadow-lg whitespace-nowrap z-50 border-2 border-white"
                  >
                    {t('game.dealer', 'DEALER')}
                  </motion.div>
                )}

                {/* Player Label */}
                <div
                  className={`absolute ${pos === 'top' ? '-bottom-8' : '-top-8'} left-1/2 -translate-x-1/2 text-white/50 text-xs font-bold uppercase tracking-widest`}
                >
                  {pos === 'bottom' ? 'You' : `Player ${item.playerIndex + 1}`}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default TuzovanieOverlay;
