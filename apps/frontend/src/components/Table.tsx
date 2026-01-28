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
import { useResponsiveCards } from '../hooks';

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
  const { tableCardSize } = useResponsiveCards();
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
    if (index === 0) return 'bottom-left'; // Force Hero to Bottom-Left per user request

    if (total === 2) {
      return 'top-center'; // Head to head
    }
    if (total === 3) {
      if (index === 1) return 'top-left';
      return 'top-right';
    }
    if (total === 4) {
      // 4 Players: Me (BL), Clockwise -> Left, Top, Right
      // Note: index 1 is Left, index 2 is Top, index 3 is Right
      if (index === 1) return 'left-center';
      if (index === 2) return 'top-center';
      return 'right-center';
    }
    // 5+ players (fallback)
    const positions: Position[] = [
      'bottom-left',
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
    if (index === -1) return 'bottom-left'; // Default to Hero position
    return getPosition(index, orderedPlayers.length);
  };

  const cardsPerPlayer = useGameStore((state) => state.gameState?.cardsPerPlayer) || 0;

  // Render Opponent Cards (Backs) - Partially off-screen
  const renderOpponentHand = (position: Position, _player: Player) => {
    if (position === 'bottom-left' || position === 'bottom-center') return null; // Hero handled separately

    // Calculate position for cards relative to viewport edge
    // "Visible part max 60%" -> shift them off-screen
    let containerClass = '';
    let cardRotation = 0;

    switch (position) {
      case 'top-left':
        containerClass = '-top-12 left-20 rotate-180'; // Stick out from top
        cardRotation = 180;
        break;
      case 'top-right':
        containerClass = '-top-12 right-20 rotate-180';
        cardRotation = 180;
        break;
      case 'top-center':
        containerClass = '-top-12 left-1/2 -translate-x-1/2 rotate-180';
        cardRotation = 180;
        break;
      case 'bottom-right':
        containerClass = 'bottom-32 -right-12 -rotate-90'; // Stick out from right
        cardRotation = -90;
        break;
      case 'left-center':
        containerClass = 'top-[40%] -left-12 rotate-90'; // Left Opponent (top 40%)
        cardRotation = 90;
        break;
      case 'right-center':
        containerClass = 'top-[40%] -right-12 -rotate-90'; // Right Opponent (top 40%)
        cardRotation = -90;
        break;
      default:
        return null;
    }

    // Just show a stack representation (3 cards fanned slightly)
    const cardCount = Math.min(cardsPerPlayer, 5); // Cap visual at 5
    if (cardCount <= 0) return null;

    return (
      <div className={`absolute ${containerClass} z-20 pointer-events-none`}>
        {Array.from({ length: Math.min(3, cardCount) }).map((_, i) => (
          <div
            key={i}
            className="absolute shadow-2xl"
            style={{
              left: i * 4, // Tight stack
              top: i * 0,
              transform: `rotate(${cardRotation + i * 2}deg)`,
              zIndex: i,
            }}
          >
            <Card card={undefined} faceDown size="xs" className="border-2 border-white/10" />
          </div>
        ))}
        {/* Count Badge */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 whitespace-nowrap">
          {cardsPerPlayer}
        </div>
      </div>
    );
  };

  // 2. Render Players
  const renderPlayer = (player: Player, index: number) => {
    const position = getPosition(index, orderedPlayers.length);
    const isTurn = player.id === currentPlayerId;

    // Check if this player is the dealer (dealerIndex is relative to original players array)
    const originalPlayerIndex = players.findIndex((p) => p.id === player.id);
    const isDealer = dealerIndex !== undefined && originalPlayerIndex === dealerIndex;

    // Absolute positioning styles around the SCREEN (Full Immersion)
    const posStyles: Record<Position, string> = {
      // Hero (Bottom Left) - Adjusted for safe padding and visibility
      'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2 z-40', // Fallback
      'bottom-left': 'bottom-20 left-6 z-40', // Explicit Hero Position (Higher up)
      'bottom-right': 'bottom-20 right-6 z-40',

      // Top Opponents - Adjusted closer to center/safe area
      'top-center': 'top-6 left-1/2 -translate-x-1/2',
      'top-left': 'top-6 left-6',
      'top-right': 'top-6 right-6',

      // Side Opponents (Vertical Centered or Top 40% as requested)
      'left-center': 'top-[35%] left-6 -translate-y-1/2', // Moved slightly up and inward
      'right-center': 'top-[35%] right-6 -translate-y-1/2', // Moved slightly up and inward
    };

    return (
      <React.Fragment key={player.id}>
        {/* Player Avatar & Info */}
        <div className={`absolute ${posStyles[position]} z-30 transition-all duration-500`}>
          <PlayerInfo
            player={player}
            position={position}
            isCurrentTurn={isTurn}
            isDealer={isDealer}
          />
        </div>

        {/* Opponent Hand (Card Backs) */}
        {renderOpponentHand(position, player)}
      </React.Fragment>
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
      const randomAngle = (hash % 10) - 5; // -5 to +5 degrees variation (REFINED)
      const randomX = (hash % 16) - 8; // -8 to +8px variation (~10% card overlap max)
      const randomY = ((hash * 13) % 16) - 8; // Different seed for Y

      // Initial positions (off-screen / player hand area)
      const startPos: Record<Position, { x: number; y: number; rotate: number }> = {
        'bottom-center': { x: 0, y: 400, rotate: 0 },
        // Hero (Bottom-Left) starts from Bottom-Center (Hand position)
        'bottom-left': { x: 0, y: 500, rotate: 0 },
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
        'bottom-left': 5, // Slightly angled from left
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
        'bottom-center': { x: 0, y: -20 }, // Shifted UP (was 30) to avoid hand overlap
        'bottom-left': { x: -20, y: -20 }, // Shifted UP (was 30)
        'bottom-right': { x: 20, y: -20 }, // Shifted UP (was 20)
        'top-left': { x: -20, y: -40 },
        'top-center': { x: 0, y: -50 },
        'top-right': { x: 20, y: -40 },
        'left-center': { x: -40, y: -20 },
        'right-center': { x: 40, y: -20 },
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
          className="absolute z-10" // Layer 1: Played Cards (Below Trump/Avatars)
          style={{ zIndex: 10 + i }} // Base z-index 10
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
        'bottom-center': { x: 0, y: 150, rotate: 0 }, // Raised significantly from 220
        'bottom-left': { x: -100, y: 120, rotate: 20 }, // Moved inward/up from -150/160
        'bottom-right': { x: 100, y: 120, rotate: -20 }, // Moved inward/up from 150/160
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
            delay: dealIndex * 0.42,
            duration: 0.56,
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
                transition={{ delay: dealIndex * 0.42 + 0.35, type: 'spring' }}
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
    // Only render if there's a trump or joker-as-trump
    if (!trump && !trumpCard && !isJokerTrump) return null;

    return (
      <div className="absolute top-[15%] right-[10%] z-20 flex flex-col items-center pointer-events-none transform rotate-[-5deg]">
        <div className="relative">
          {/* Deck Representation (Underneath) */}
          <div className="absolute -top-1 -left-1 w-full h-full bg-[#8b0000] rounded-lg border border-[#5a0000] shadow-sm transform -rotate-2" />
          <div className="absolute -top-0.5 -left-0.5 w-full h-full bg-[#8b0000] rounded-lg border border-[#5a0000] shadow-sm transform -rotate-1" />

          {/* The Trump Card - Matches Table Card Style exactly */}
          {trumpCard ? (
            <div className="relative transform rotate-90 origin-center shadow-xl">
              <Card
                card={trumpCard}
                size={tableCardSize} // Match table card size exactly
                className="border-none shadow-2xl" // Remove extra borders to match table cards
              />
            </div>
          ) : trump ? (
            /* Fallback Suit Icon if card not visible (9-card round) */
            <div className="w-12 h-16 md:w-16 md:h-24 bg-slate-900/80 backdrop-blur-sm rounded-lg border-2 border-yellow-500/50 flex flex-col items-center justify-center shadow-xl">
              <SuitIcon
                suit={trump}
                className={`w-8 h-8 md:w-10 md:h-10 ${trump === Suit.Hearts || trump === Suit.Diamonds ? 'text-red-500' : 'text-white'}`}
              />
              <span className="text-[8px] md:text-[10px] text-yellow-500 font-bold uppercase mt-1 tracking-wider">
                Trump
              </span>
            </div>
          ) : (
            /* No Trump (Joker) */
            <div className="w-12 h-16 md:w-16 md:h-24 bg-slate-900/80 backdrop-blur-sm rounded-lg border-2 border-purple-500/50 flex flex-col items-center justify-center shadow-xl">
              <span className="text-xl md:text-2xl">🃏</span>
              <span className="text-[8px] md:text-[10px] text-purple-300 font-bold uppercase mt-1 tracking-wider">
                No Trump
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // const tableSurfaceSize = isMobileLandscape ? 'w-[88%] h-[72%]' : 'w-full h-full'; // Unused

  return (
    <div className={`relative flex items-center justify-center w-full h-full ${className}`}>
      {/* FULL SCREEN TABLE CONTAINER - No Oval, Just Texture */}
      <div className="absolute inset-0 z-0 bg-felt-gradient">
        {/* Texture Pattern */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url('https://www.transparenttextures.com/patterns/felt.png')`,
            backgroundRepeat: 'repeat',
          }}
        />
        {/* Vignette / Rail Effect - Updated to user spec */}
        <div className="absolute inset-0 shadow-[inset_0_0_80px_20px_rgba(0,0,0,0.8)] pointer-events-none" />

        {/* Center Decoration (Subtle Logo) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <div className="w-64 h-64 rounded-full border-4 border-black/20 flex items-center justify-center">
            <span className="text-6xl font-serif font-black text-black/40 tracking-widest">
              JOKER
            </span>
          </div>
        </div>
      </div>

      <div className={`relative w-full h-full z-10`}>
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

        {/* Trump Area (Dedicated) */}
        {gamePhase !== GamePhase.Tuzovanie && <TrumpIndicator />}

        {/* Table Cards Area */}
        <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
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
