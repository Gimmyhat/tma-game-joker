import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TableCard, Suit, GamePhase, Card as CardType } from '@joker/shared';
import { useGameStore } from '../store/gameStore';
import { determineTrickWinner } from '../utils/gameLogic';
import PlayerInfo from './PlayerInfo';
import { useResponsiveCards } from '../hooks';
import { Position, TuzovanieSequenceItem } from './table/types';
import { TrumpIndicator } from './table/TrumpIndicator';
import { OpponentHand } from './table/OpponentHand';
import { TableCards } from './table/TableCards';
import { TuzovanieAnimation } from './table/TuzovanieAnimation';

interface TableProps {
  players: Player[];
  tableCards: TableCard[];
  trump: Suit | null;
  trumpCard?: CardType | null;
  currentPlayerId?: string;
  myPlayerId: string;
  dealerIndex?: number;
  className?: string;
  isJokerTrump?: boolean;
  tuzovanieCards?: CardType[][] | null;
  tuzovanieDealerIndex?: number | null;
  showTuzovanieForce?: boolean; // Prop from parent to force tuzovanie view
}

export const Table: React.FC<TableProps> = ({
  players,
  tableCards,
  trump,
  trumpCard,
  currentPlayerId,
  myPlayerId,
  dealerIndex,
  className = '',
  isJokerTrump = false,
  tuzovanieCards = null,
  tuzovanieDealerIndex = null,
  showTuzovanieForce = false,
}) => {
  const { t } = useTranslation();
  const { tableCardSize } = useResponsiveCards();
  const gamePhase = useGameStore((state) => state.gameState?.phase);
  const tuzovanieSequence = useGameStore((state) => state.tuzovanieSequence) as
    | TuzovanieSequenceItem[]
    | null;
  const cardsPerPlayer = useGameStore((state) => state.gameState?.cardsPerPlayer) || 0;
  const [showWinningAnimation, setShowWinningAnimation] = React.useState(false);
  // Removed local showTuzovanie state in favor of prop control for better orchestration

  // Delay winning animation to let the last card land and be seen
  React.useEffect(() => {
    if (gamePhase === GamePhase.TrickComplete) {
      const timer = setTimeout(() => setShowWinningAnimation(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowWinningAnimation(false);
    }
  }, [gamePhase]);

  // Log dealer index during Tuzovanie for debug
  React.useEffect(() => {
    if (gamePhase === GamePhase.Tuzovanie && tuzovanieDealerIndex !== null) {
      // Used to verify the server's decision against the visual animation
    }
  }, [gamePhase, tuzovanieDealerIndex]);

  // Determine winner if trick is complete
  const winnerId = useMemo(() => {
    if (gamePhase === GamePhase.TrickComplete) {
      return determineTrickWinner(tableCards, trump);
    }
    return null;
  }, [gamePhase, tableCards, trump]);

  // Calculate ordered players (rotated so myPlayerId is at index 0)
  const orderedPlayers = useMemo(() => {
    if (!players.length) return [];
    const myIndex = players.findIndex((p) => p.id === myPlayerId);
    if (myIndex === -1) return players;
    return [...players.slice(myIndex), ...players.slice(0, myIndex)];
  }, [players, myPlayerId]);

  // Map relative index to physical table position
  const getPosition = (index: number, total: number): Position => {
    if (index === 0) return 'bottom-center';
    if (total === 2) return 'top-center';
    if (total === 3) {
      if (index === 1) return 'left-center';
      return 'right-center';
    }
    if (total === 4) {
      if (index === 1) return 'left-center';
      if (index === 2) return 'top-center';
      return 'right-center';
    }
    const positions: Position[] = [
      'bottom-center',
      'left-center',
      'top-left',
      'top-right',
      'right-center',
    ];
    return positions[index % positions.length];
  };

  // Helper to find visual position of a specific playerId
  const getPlayerPosition = (pid: string): Position => {
    const index = orderedPlayers.findIndex((p) => p.id === pid);
    if (index === -1) return 'bottom-center';
    return getPosition(index, orderedPlayers.length);
  };

  // Position styles for player avatars
  const posStyles: Record<Position, string> = {
    'bottom-center': 'bottom-32 left-1/2 -translate-x-1/2 z-40',
    'bottom-left': 'bottom-20 left-6 z-40',
    'bottom-right': 'bottom-20 right-6 z-40',
    'top-center': 'top-14 left-1/2 -translate-x-1/2',
    'top-left': 'top-14 left-6',
    'top-right': 'top-14 right-6',
    'left-center': 'top-1/2 -translate-y-1/2 left-2',
    'right-center': 'top-1/2 -translate-y-1/2 right-2',
  };

  // Render player with avatar and opponent hand
  const renderPlayer = (player: Player, index: number) => {
    const position = getPosition(index, orderedPlayers.length);
    const isTurn = player.id === currentPlayerId;
    const originalPlayerIndex = players.findIndex((p) => p.id === player.id);
    const isDealer = dealerIndex !== undefined && originalPlayerIndex === dealerIndex;

    return (
      <React.Fragment key={player.id}>
        <div className={`absolute ${posStyles[position]} z-30 transition-all duration-500`}>
          <PlayerInfo
            player={player}
            position={position}
            isCurrentTurn={isTurn}
            isDealer={isDealer}
          />
        </div>
        <OpponentHand position={position} cardsPerPlayer={cardsPerPlayer} />
      </React.Fragment>
    );
  };

  return (
    <div className={`relative flex items-center justify-center w-full h-full ${className}`}>
      {/* FULL SCREEN TABLE CONTAINER */}
      <div className="absolute inset-0 z-0 bg-felt-gradient">
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url('https://www.transparenttextures.com/patterns/felt.png')`,
            backgroundRepeat: 'repeat',
          }}
        />
        <div className="absolute inset-0 shadow-[inset_0_0_80px_20px_rgba(0,0,0,0.8)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <div className="w-64 h-64 rounded-full border-4 border-black/20 flex items-center justify-center">
            <span className="text-6xl font-serif font-black text-black/40 tracking-widest">
              JOKER
            </span>
          </div>
        </div>
      </div>

      {/* SAFE AREA CONTAINER */}
      <div className={`relative w-full h-full z-10 px-safe-x py-safe-y`}>
        {/* Center Active Turn Text */}
        {currentPlayerId && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[140%] z-0 text-center pointer-events-none transition-opacity duration-300">
            <div className="text-[10px] text-gold/60 uppercase tracking-[0.2em] font-bold">
              {t('game.table.currentTurn')}
            </div>
            <div className="text-xl font-bold text-white/80 tracking-widest drop-shadow-md">
              {players.find((p) => p.id === currentPlayerId)?.name ===
              players.find((p) => p.id === myPlayerId)?.name
                ? t('game.yourTurn')
                : players.find((p) => p.id === currentPlayerId)?.name?.toUpperCase()}
            </div>
          </div>
        )}

        {/* Trump Area - Hide during Tuzovanie OR if we are forcing Tuzovanie view */}
        {gamePhase !== GamePhase.Tuzovanie && !showTuzovanieForce && (
          <TrumpIndicator
            trump={trump}
            trumpCard={trumpCard}
            isJokerTrump={isJokerTrump}
            tableCardSize={tableCardSize}
          />
        )}

        {/* Table Cards Area */}
        <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
          <div className="absolute top-1/2 left-1/2 w-0 h-0">
            {showTuzovanieForce ? (
              <TuzovanieAnimation
                players={players}
                tuzovanieCards={tuzovanieCards}
                tuzovanieSequence={tuzovanieSequence}
                tableCardSize={tableCardSize}
                getPlayerPosition={getPlayerPosition}
              />
            ) : (
              <TableCards
                tableCards={tableCards}
                tableCardSize={tableCardSize}
                getPlayerPosition={getPlayerPosition}
                winnerId={winnerId}
                showWinningAnimation={showWinningAnimation}
              />
            )}
          </div>
        </div>

        {/* Trick Winner Notification */}
        <AnimatePresence>
          {gamePhase === GamePhase.TrickComplete && winnerId && showWinningAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 1.1, x: '-50%', y: '-50%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute top-1/2 left-1/2 z-50 pointer-events-none whitespace-nowrap"
            >
              <div className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl shadow-[0_10px_40px_rgba(245,158,11,0.5)] border-4 border-amber-300 flex items-center gap-3 transform -rotate-2">
                <span className="text-2xl font-black uppercase tracking-wider drop-shadow-sm">
                  {players.find((p) => p.id === winnerId)?.name}
                </span>
                <span className="text-2xl">🏆</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Players Layer */}
        {orderedPlayers.map((p, i) => renderPlayer(p, i))}
      </div>
    </div>
  );
};

export default Table;
