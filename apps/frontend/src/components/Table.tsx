import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TableCard, Suit, GamePhase } from '@joker/shared';
import { useGameStore } from '../store/gameStore';
import { determineTrickWinner } from '../utils/gameLogic';
import Card from './Card';
import PlayerInfo from './PlayerInfo';
import { SuitIcon } from './SuitIcon';

interface TableProps {
  players: Player[];
  tableCards: TableCard[];
  trump: Suit | null;
  currentPlayerId?: string;
  myPlayerId: string;
  className?: string;
  isJokerTrump?: boolean;
}

type Position =
  | 'bottom-center'
  | 'bottom-left'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-right'
  | 'left-center'
  | 'right-center';

export const Table: React.FC<TableProps> = ({
  players,
  tableCards,
  trump,
  currentPlayerId,
  myPlayerId,
  className = '',
  isJokerTrump = false,
}) => {
  const { t } = useTranslation();
  const gamePhase = useGameStore((state) => state.gameState?.phase);

  // Determine winner if trick is complete
  const winnerId = useMemo(() => {
    if (gamePhase === GamePhase.TrickComplete) {
      return determineTrickWinner(tableCards, trump);
    }
    return null;
  }, [gamePhase, tableCards, trump]);

  // 1. Calculate Positions
  const orderedPlayers = useMemo(() => {
    if (!players.length) return [];
    const myIndex = players.findIndex((p) => p.id === myPlayerId);
    if (myIndex === -1) return players;

    // Rotate array so myIndex is 0 (Me)
    const rotated = [...players.slice(myIndex), ...players.slice(0, myIndex)];
    return rotated;
  }, [players, myPlayerId]);

  // Map relative index (0=Me) to physical table slots based on player count
  const getPosition = (index: number, total: number): Position => {
    if (index === 0) return 'bottom-center'; // Me

    if (total === 2) {
      return 'top-center'; // Head to head
    }
    if (total === 3) {
      if (index === 1) return 'top-left';
      return 'top-right';
    }
    if (total === 4) {
      // 4 Players: Me (bottom), Left, Top, Right
      if (index === 1) return 'left-center';
      if (index === 2) return 'top-center';
      return 'right-center';
    }
    // 5+ players (fallback to original circular spread or adjust)
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

  // 2. Render Players
  const renderPlayer = (player: Player, index: number) => {
    const position = getPosition(index, orderedPlayers.length);
    const isTurn = player.id === currentPlayerId;

    // Absolute positioning styles around the oval
    // We push them outward from the table edge
    const posStyles: Record<Position, string> = {
      'bottom-center': '-bottom-12 left-1/2 -translate-x-1/2 translate-y-0',
      'bottom-left': '-bottom-8 left-[20%] translate-y-full',
      'bottom-right': '-bottom-8 right-[20%] translate-y-full',
      'top-left': 'top-[15%] -left-12 -translate-x-full',
      'top-center': '-top-16 left-1/2 -translate-x-1/2 translate-y-0',
      'top-right': 'top-[15%] -right-12 translate-x-full',
      'left-center': 'top-1/2 -left-16 -translate-x-full -translate-y-1/2',
      'right-center': 'top-1/2 -right-16 translate-x-full -translate-y-1/2',
    };

    return (
      <div
        key={player.id}
        className={`absolute ${posStyles[position]} z-30 transition-all duration-500`}
      >
        <PlayerInfo
          player={player}
          position={position}
          isCurrentTurn={isTurn}
          onScoreClick={
            player.id === myPlayerId
              ? () => {
                  const event = new CustomEvent('openScoringModal');
                  window.dispatchEvent(event);
                }
              : undefined
          }
        />
      </div>
    );
  };

  // 3. Render Table Cards
  // Cards float in the center area, offset towards their owner
  const renderTableCards = () => {
    return tableCards.map((tc, i) => {
      const pos = getPlayerPosition(tc.playerId);

      // Calculate offsets based on position to create a "pile" in the center but clear who played what
      // Oval center is 0,0
      const offsets: Record<Position, string> = {
        'bottom-center': 'translate-y-12 translate-x-0 rotate-0',
        'bottom-left': 'translate-y-8 -translate-x-12 rotate-[-10deg]',
        'bottom-right': 'translate-y-8 translate-x-12 rotate-[10deg]',
        'top-left': '-translate-y-4 -translate-x-16 rotate-[-5deg]',
        'top-center': '-translate-y-12 translate-x-0',
        'top-right': '-translate-y-4 translate-x-16 rotate-[5deg]',
        'left-center': '-translate-y-0 -translate-x-20 rotate-[-90deg]',
        'right-center': '-translate-y-0 translate-x-20 rotate-[90deg]',
      };

      // Inverse rotation for badges to keep them horizontal
      const badgeRotation: Record<Position, string> = {
        'bottom-center': 'rotate-0',
        'bottom-left': 'rotate-[10deg]',
        'bottom-right': 'rotate-[-10deg]',
        'top-left': 'rotate-[5deg]',
        'top-center': 'rotate-0',
        'top-right': 'rotate-[-5deg]',
        'left-center': 'rotate-[90deg]',
        'right-center': 'rotate-[-90deg]',
      };

      // Animation targets for flying to winner
      const flyTo: Record<Position, { x: number; y: number }> = {
        'bottom-center': { x: 0, y: 400 },
        'bottom-left': { x: -300, y: 400 },
        'bottom-right': { x: 300, y: 400 },
        'top-left': { x: -300, y: -400 },
        'top-center': { x: 0, y: -400 },
        'top-right': { x: 300, y: -400 },
        'left-center': { x: -500, y: 0 },
        'right-center': { x: 500, y: 0 },
      };

      // If there is a winner, all cards fly to that winner's position
      const winnerPos = winnerId ? getPlayerPosition(winnerId) : null;
      const animateProps = winnerPos
        ? {
            x: flyTo[winnerPos].x,
            y: flyTo[winnerPos].y,
            opacity: 0,
            scale: 0.5,
          }
        : {}; // Default state is handled by className offsets

      return (
        <motion.div
          key={`${tc.playerId}-${tc.card.id}`}
          initial={{ opacity: 0, scale: 0.5, y: -50 }}
          className={`absolute transition-all duration-500 ease-out ${offsets[pos]}`}
          style={{ zIndex: 20 + i }}
          animate={animateProps}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <Card
            card={tc.card}
            size="md"
            className="shadow-2xl border-none"
            // Apply slight random rotation for realism (except mostly straight for N/S/E/W)
            style={{ transform: `rotate(${Math.random() * 2 - 1}deg)` }}
          />
          {/* Show Joker Request */}
          {tc.requestedSuit && (
            <div
              className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg flex items-center gap-2 border border-white/10 ${badgeRotation[pos]}`}
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
          )}
        </motion.div>
      );
    });
  };

  const TrumpIndicator = () => {
    if (trump) {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-10 pointer-events-none z-0">
          <div
            className={`
            text-9xl font-black
            ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-900' : 'text-slate-900'}
          `}
          >
            {trump === Suit.Hearts && '♥'}
            {trump === Suit.Diamonds && '♦'}
            {trump === Suit.Clubs && '♣'}
            {trump === Suit.Spades && '♠'}
          </div>
        </div>
      );
    }

    if (isJokerTrump) {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-10 pointer-events-none z-0">
          <div className="text-8xl font-black text-slate-900 flex flex-col items-center">
            <span>JOKER</span>
            <span className="text-4xl mt-2">{t('game.trump.noTrump')}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* The Oval Table Surface */}
      <div
        className="relative w-full h-full rounded-[50%] bg-[#0f3d23] shadow-[0_20px_60px_rgba(0,0,0,0.5),_inset_0_0_80px_rgba(0,0,0,0.5)]"
        style={{
          border: '12px solid #3d2211', // Wood border
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 100px #051c0e',
        }}
      >
        {/* Felt Texture */}
        <div className="absolute inset-0 rounded-[50%] opacity-100 bg-[radial-gradient(ellipse_at_center,_#1a5c32_0%,_#0f3d23_100%)]">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]"></div>
        </div>

        {/* Center Decoration / HUD */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Center Ring - subtle felt line */}
          <div className="w-[40%] h-[40%] rounded-full border-2 border-green-800/30 flex items-center justify-center">
            <div className="w-[80%] h-[80%] rounded-full border border-green-800/20" />
          </div>

          {/* Active Status Text Overlay */}
          {currentPlayerId && (
            <div className="absolute z-10 text-center">
              <div className="text-[10px] text-yellow-500 uppercase tracking-[0.2em] mb-1 font-bold opacity-80">
                {t('game.table.currentTurn')}
              </div>
              <div className="text-2xl font-bold text-white tracking-widest drop-shadow-md">
                {players.find((p) => p.id === currentPlayerId)?.name ===
                players.find((p) => p.id === myPlayerId)?.name
                  ? t('game.yourTurn')
                  : t('game.waitingFor').toUpperCase() + '...'}
              </div>
            </div>
          )}
        </div>

        {/* Trump Big Watermark */}
        <TrumpIndicator />

        {/* Table Cards Area */}
        <div className="absolute inset-0 z-20 overflow-visible">
          {/* Center point anchor */}
          <div className="absolute top-1/2 left-1/2 w-0 h-0">{renderTableCards()}</div>
        </div>

        {/* Trick Winner Notification */}
        <AnimatePresence>
          {gamePhase === GamePhase.TrickComplete && winnerId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 1.1, x: '-50%', y: '-50%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute top-1/2 left-1/2 z-50 pointer-events-none whitespace-nowrap"
            >
              <div className="bg-amber-500 text-slate-900 px-8 py-4 rounded-2xl shadow-[0_10px_40px_rgba(245,158,11,0.5)] border-4 border-amber-300 flex items-center gap-3 transform -rotate-2">
                <span className="text-3xl font-black uppercase tracking-wider drop-shadow-sm">
                  {t('game.trickWon', {
                    player: players.find((p) => p.id === winnerId)?.name,
                  })}
                </span>
                <span className="text-3xl">🏆</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Players - Positioned absolutely around the table container */}
      {orderedPlayers.map((p, i) => renderPlayer(p, i))}

      {/* Current Trump Bubble (Small, UI) - Floating near table edge top-right */}
      {(trump || isJokerTrump) && (
        <div className="absolute -top-4 -right-4 z-40 flex flex-col items-center bg-slate-900/90 p-3 rounded-full border-2 border-yellow-600 shadow-xl">
          <span className="text-[8px] text-yellow-500 uppercase tracking-widest mb-1 font-bold">
            {t('game.trump.label')}
          </span>
          {trump ? (
            <span
              className={`text-2xl leading-none ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-500' : 'text-slate-200'}`}
            >
              {trump === Suit.Hearts && '♥'}
              {trump === Suit.Diamonds && '♦'}
              {trump === Suit.Clubs && '♣'}
              {trump === Suit.Spades && '♠'}
            </span>
          ) : (
            <span className="text-xl leading-none text-slate-200 font-bold">Ø</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Table;
