import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TableCard as TableCardType, Suit, JokerOption } from '@joker/shared';
import Card from '../Card';
import { SuitIcon } from '../SuitIcon';
import {
  Position,
  CardSize,
  START_POSITIONS,
  BASE_ROTATION,
  TARGET_POSITIONS,
  hashString,
} from './types';

export interface TableCardsProps {
  tableCards: TableCardType[];
  tableCardSize: CardSize;
  getPlayerPosition: (playerId: string) => Position;
  winnerId: string | null;
  showWinningAnimation: boolean;
}

export const TableCards: React.FC<TableCardsProps> = ({
  tableCards,
  tableCardSize,
  getPlayerPosition,
  winnerId,
  showWinningAnimation,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {tableCards.map((tc, i) => {
        const pos = getPlayerPosition(tc.playerId);

        // Generate stable random values based on card ID
        const hash = hashString(tc.card.id);
        const randomAngle = (hash % 10) - 5;
        const randomX = (hash % 16) - 8;
        const randomY = ((hash * 13) % 16) - 8;

        const start = START_POSITIONS[pos];
        const target = TARGET_POSITIONS[pos];
        const finalRotation = BASE_ROTATION[pos] + randomAngle;

        // Animation targets for flying to winner (cleanup phase)
        const targetWinnerPos =
          winnerId && showWinningAnimation ? getPlayerPosition(winnerId) : null;
        const flyTo = targetWinnerPos ? START_POSITIONS[targetWinnerPos] : null;

        const initialProps = {
          opacity: 0,
          scale: 0.8,
          x: start.x,
          y: start.y,
          rotate: start.rotate,
        };

        const animateProps =
          targetWinnerPos && flyTo
            ? {
                x: flyTo.x,
                y: flyTo.y,
                opacity: 0,
                scale: 0.4,
                rotate: flyTo.rotate,
                transition: { duration: 0.8, ease: 'easeInOut' as const },
              }
            : {
                x: target.x + randomX,
                y: target.y + randomY,
                opacity: 1,
                scale: 1,
                rotate: finalRotation,
                transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
              };

        return (
          <motion.div
            key={`${tc.playerId}-${tc.card.id}`}
            initial={initialProps}
            animate={animateProps}
            className="absolute z-10"
            style={{ zIndex: 10 + i }}
          >
            <Card card={tc.card} size={tableCardSize} className="shadow-2xl border-none" />
            {/* Joker Action / Request Badge */}
            {tc.jokerOption ? (
              <div
                className={`absolute -top-14 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-xl whitespace-nowrap shadow-[0_4px_10px_rgba(0,0,0,0.4)] flex items-center gap-1.5 border-2 backdrop-blur-md z-30 transition-transform duration-300
                  ${
                    tc.jokerOption === JokerOption.Top
                      ? 'bg-amber-900/90 border-amber-400 text-amber-100'
                      : tc.jokerOption === JokerOption.Bottom
                        ? 'bg-purple-900/90 border-purple-400 text-purple-100'
                        : 'bg-slate-900/90 border-slate-500 text-white'
                  }
                `}
                style={{ transform: `rotate(${-finalRotation}deg)` }}
              >
                <span className="text-sm leading-none filter drop-shadow-sm">
                  {tc.jokerOption === JokerOption.High && '⬆️'}
                  {tc.jokerOption === JokerOption.Low && '⬇️'}
                  {tc.jokerOption === JokerOption.Top && '👑'}
                  {tc.jokerOption === JokerOption.Bottom && '🛡️'}
                </span>
                <span className="mt-[1px]">
                  {tc.jokerOption === JokerOption.High && t('game.joker.high', 'HIGH')}
                  {tc.jokerOption === JokerOption.Low && t('game.joker.low', 'LOW')}
                  {tc.jokerOption === JokerOption.Top && t('game.joker.take', 'TAKE')}
                  {tc.jokerOption === JokerOption.Bottom && t('game.joker.pass', 'PASS')}
                </span>
                {tc.requestedSuit && (
                  <>
                    <div className="w-px h-3 bg-current opacity-30 mx-0.5" />
                    <SuitIcon
                      suit={tc.requestedSuit}
                      className={`w-3.5 h-3.5 ${
                        tc.requestedSuit === Suit.Hearts || tc.requestedSuit === Suit.Diamonds
                          ? 'text-red-500'
                          : 'text-white'
                      }`}
                    />
                  </>
                )}
              </div>
            ) : tc.requestedSuit ? (
              /* Fallback for legacy/other cases */
              <div
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg flex items-center gap-2 border border-white/10"
                style={{ transform: `rotate(${-finalRotation}deg)` }}
              >
                <span className="opacity-80">{t('game.table.req')}</span>
                <SuitIcon
                  suit={tc.requestedSuit}
                  className={`w-4 h-4 ${
                    tc.requestedSuit === Suit.Hearts || tc.requestedSuit === Suit.Diamonds
                      ? 'text-red-500'
                      : 'text-white'
                  }`}
                />
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </>
  );
};

export default TableCards;
