import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Player,
  TableCard,
  Suit,
  GamePhase,
  Card as CardType,
  JokerOption,
  Rank,
} from '@joker/shared';
import { useGameStore } from '../store/gameStore';
import { determineTrickWinner } from '../utils/gameLogic';
import Card from './Card';
import PlayerInfo from './PlayerInfo';
import { SuitIcon } from './SuitIcon';

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
  trumpCard,
  currentPlayerId,
  myPlayerId,
  dealerIndex,
  className = '',
  isJokerTrump = false,
  tuzovanieCards = null,
  tuzovanieDealerIndex = null,
}) => {
  const { t } = useTranslation();
  const gamePhase = useGameStore((state) => state.gameState?.phase);
  const [showWinningAnimation, setShowWinningAnimation] = React.useState(false);

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
      // console.log('Dealer Index:', tuzovanieDealerIndex);
    }
  }, [gamePhase, tuzovanieDealerIndex]);

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

    // Check if this player is the dealer (dealerIndex is relative to original players array)
    const originalPlayerIndex = players.findIndex((p) => p.id === player.id);
    const isDealer = dealerIndex !== undefined && originalPlayerIndex === dealerIndex;

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
          isDealer={isDealer}
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
  // Cards fly from player position to center with slight randomness
  const renderTableCards = () => {
    return tableCards.map((tc, i) => {
      const pos = getPlayerPosition(tc.playerId);

      // Generate stable random values based on card ID to avoid jitter on re-renders
      // Simple hash function for pseudo-randomness
      const hash = tc.card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomAngle = (hash % 20) - 10; // -10 to +10 degrees variation
      const randomX = (hash % 16) - 8; // -8 to +8px variation (~10% card overlap max)
      const randomY = ((hash * 13) % 16) - 8; // Different seed for Y

      // Initial positions (off-screen / player hand area)
      const startPos: Record<Position, { x: number; y: number; rotate: number }> = {
        'bottom-center': { x: 0, y: 400, rotate: 0 },
        'bottom-left': { x: -300, y: 400, rotate: 15 },
        'bottom-right': { x: 300, y: 400, rotate: -15 },
        'top-left': { x: -300, y: -400, rotate: 165 },
        'top-center': { x: 0, y: -400, rotate: 180 },
        'top-right': { x: 300, y: -400, rotate: 195 },
        'left-center': { x: -500, y: 0, rotate: 90 },
        'right-center': { x: 500, y: 0, rotate: -90 },
      };

      // Target base rotation (card orientation on table)
      // Players throw cards "facing" the center
      const baseRotation: Record<Position, number> = {
        'bottom-center': 0,
        'bottom-left': 30, // Angled inward
        'bottom-right': -30,
        'top-left': 150,
        'top-center': 180, // Facing me upside down
        'top-right': 210,
        'left-center': 90,
        'right-center': -90,
      };

      // Target positions (center of table with slight offset towards player)
      // We use small offsets so they form a loose cluster/pile
      const targetPos: Record<Position, { x: number; y: number }> = {
        'bottom-center': { x: 0, y: 30 },
        'bottom-left': { x: -20, y: 20 },
        'bottom-right': { x: 20, y: 20 },
        'top-left': { x: -20, y: -20 },
        'top-center': { x: 0, y: -30 },
        'top-right': { x: 20, y: -20 },
        'left-center': { x: -40, y: 0 },
        'right-center': { x: 40, y: 0 },
      };

      const start = startPos[pos];
      const target = targetPos[pos];
      const finalRotation = baseRotation[pos] + randomAngle;

      // Badge rotation (to keep text readable/horizontal-ish if needed, or relative to card)
      // We'll just let it rotate with card for realism

      // Animation targets for flying to winner (cleanup phase)
      const targetWinnerPos = winnerId && showWinningAnimation ? getPlayerPosition(winnerId) : null;
      const flyTo = targetWinnerPos ? startPos[targetWinnerPos] : null;

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
              rotate: flyTo.rotate, // Rotate towards winner stack
              transition: { duration: 0.8, ease: 'easeInOut' as const },
            }
          : {
              x: target.x + randomX,
              y: target.y + randomY,
              opacity: 1,
              scale: 1,
              rotate: finalRotation,
              transition: { type: 'spring' as const, stiffness: 300, damping: 25 }, // Snap effect
            };

      return (
        <motion.div
          key={`${tc.playerId}-${tc.card.id}`}
          initial={initialProps}
          animate={animateProps}
          className="absolute z-20" // Removed fixed offset classes
          style={{ zIndex: 20 + i }}
        >
          <Card card={tc.card} size="md" className="shadow-2xl border-none" />
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
    });
  };

  // 4. Render Tuzovanie Animation
  const renderTuzovanie = () => {
    if (!tuzovanieCards || gamePhase !== GamePhase.Tuzovanie) return null;

    // Flatten cards into a timeline: Round 1 (P1, P2, P3, P4), Round 2...
    const sequence: { card: CardType; playerId: string; dealIndex: number }[] = [];
    const maxRounds = Math.max(...tuzovanieCards.map((h) => h.length));

    let dealIndex = 0;
    for (let r = 0; r < maxRounds; r++) {
      for (let i = 0; i < players.length; i++) {
        // Only process if player has a card this round
        if (tuzovanieCards[i] && tuzovanieCards[i][r]) {
          sequence.push({
            card: tuzovanieCards[i][r],
            playerId: players[i].id,
            dealIndex: dealIndex++,
          });
        }
      }
    }

    return sequence.map(({ card, playerId, dealIndex }) => {
      const pos = getPlayerPosition(playerId);
      const isAce = card.type === 'standard' && card.rank === Rank.Ace;

      // Positions on the felt closer to players (near the edge)
      const targetPos: Record<Position, { x: number; y: number; rotate: number }> = {
        'bottom-center': { x: 0, y: 220, rotate: 0 },
        'bottom-left': { x: -150, y: 160, rotate: 30 },
        'bottom-right': { x: 150, y: 160, rotate: -30 },
        'top-left': { x: -150, y: -160, rotate: 150 },
        'top-center': { x: 0, y: -220, rotate: 180 },
        'top-right': { x: 150, y: -160, rotate: 210 },
        'left-center': { x: -250, y: 0, rotate: 90 },
        'right-center': { x: 250, y: 0, rotate: -90 },
      };

      const t = targetPos[pos] || { x: 0, y: 0, rotate: 0 };

      // Add messy randomness (+/- 10 degrees)
      // Use card ID hash for stable randomness
      const hash = card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomAngle = (hash % 20) - 10;

      return (
        <motion.div
          key={`tuz-${playerId}-${card.id}`}
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }} // No spin
          animate={{
            x: t.x,
            y: t.y,
            scale: isAce ? 1.3 : 1,
            opacity: 1,
            rotate: t.rotate + randomAngle, // Messy alignment
          }}
          transition={{
            delay: dealIndex * 0.6,
            duration: 0.8,
            type: 'spring',
            stiffness: 100,
            damping: 15,
          }}
          className="absolute z-50 flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="relative">
            <Card
              card={card}
              size="md"
              className={`shadow-2xl ${isAce ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-black/50' : 'border-none'}`}
            />

            {/* Dealer Badge - Show if Ace */}
            {isAce && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0 }}
                animate={{ opacity: 1, y: 45, scale: 1 }}
                transition={{ delay: dealIndex * 0.6 + 0.5, type: 'spring' }}
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

        {/* Trump Big Watermark - Hide during Tuzovanie */}
        {gamePhase !== GamePhase.Tuzovanie && <TrumpIndicator />}

        {/* Table Cards Area */}
        <div className="absolute inset-0 z-20 overflow-visible">
          {/* Center point anchor */}
          <div className="absolute top-1/2 left-1/2 w-0 h-0">
            {gamePhase === GamePhase.Tuzovanie ? renderTuzovanie() : renderTableCards()}
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

      {/* Current Trump Indicator - Floating near table edge top-right - Hide in Tuzovanie */}
      {gamePhase !== GamePhase.Tuzovanie && (trump || trumpCard || isJokerTrump) && (
        <div className="absolute -top-2 -right-2 z-40 flex flex-col items-center">
          <span className="text-[8px] text-yellow-500 uppercase tracking-widest mb-1 font-bold drop-shadow-lg">
            {t('game.trump.label')}
          </span>
          {trumpCard ? (
            // Show actual trump card when available (non-9-card rounds)
            <div className="transform rotate-6 shadow-[0_4px_20px_rgba(234,179,8,0.4)] rounded-lg">
              <Card card={trumpCard} size="sm" className="border-2 border-yellow-500/50" />
            </div>
          ) : trump ? (
            // Fallback to suit symbol (9-card rounds where player selected trump)
            <div className="bg-slate-900/90 p-3 rounded-full border-2 border-yellow-600 shadow-xl">
              <span
                className={`text-2xl leading-none ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-500' : 'text-slate-200'}`}
              >
                {trump === Suit.Hearts && '♥'}
                {trump === Suit.Diamonds && '♦'}
                {trump === Suit.Clubs && '♣'}
                {trump === Suit.Spades && '♠'}
              </span>
            </div>
          ) : (
            // No trump (joker was trump card)
            <div className="bg-slate-900/90 p-3 rounded-full border-2 border-yellow-600 shadow-xl">
              <span className="text-xl leading-none text-slate-200 font-bold">Ø</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Table;
