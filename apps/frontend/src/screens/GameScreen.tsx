import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store';
import { selectIsMyTurn, selectCanMakeBet, selectCanThrowCard } from '../store/gameStore';
import {
  Card as CardType,
  JokerOption,
  Suit,
  SharedMoveValidator,
  calculateForbiddenBet,
  sortCards,
} from '@joker/shared';
import Table from '../components/Table';
import Hand from '../components/Hand';
import { BetModal } from '../components/BetModal';
import { ScoringInfoModal } from '../components/ScoringInfoModal';
import { JokerOptionModal } from '../components/JokerOptionModal';
import { LeaveGameModal } from '../components/LeaveGameModal';
// import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  PulkaResultsModal,
  TrumpSelectionModal,
  VictoryScreen,
  HandwrittenScoreSheet,
} from '../components/game';
import { GameOverModal } from '../components/GameOverModal';
import { DevLogPanel } from '../components/DevLogPanel';

// Info Drawer Component - Compact game info panel
const InfoDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  round: number;
  cardsPerPlayer: number;
}> = ({ isOpen, onClose, round, cardsPerPlayer }) => {
  const { t } = useTranslation();

  // Determine pulka from round
  const getPulkaInfo = (r: number) => {
    if (r <= 8) return { pulka: 1, pattern: '1 → 8', type: t('game.pulka.ascending', 'Ascending') };
    if (r <= 12) return { pulka: 2, pattern: '9', type: t('game.pulka.maximum', 'Maximum') };
    if (r <= 20)
      return { pulka: 3, pattern: '8 → 1', type: t('game.pulka.descending', 'Descending') };
    return { pulka: 4, pattern: '9', type: t('game.pulka.final', 'Final') };
  };

  const pulkaInfo = getPulkaInfo(round);

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div
        className={`absolute top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-gold/30 shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">{t('game.gameInfo', 'Game Info')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Round Info */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/10 mb-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              {t('game.round', 'Round')}
            </div>
            <div className="text-3xl font-bold text-gold">
              {round}
              <span className="text-lg text-slate-500">/24</span>
            </div>
          </div>

          {/* Pulka Info */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/10 mb-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              {t('game.pulka.title', { id: pulkaInfo.pulka })}
            </div>
            <div className="text-lg font-bold text-white mb-1">{pulkaInfo.type}</div>
            <div className="text-sm text-slate-400">
              {t('game.cards', 'Cards')}: {pulkaInfo.pattern}
            </div>
          </div>

          {/* Cards in Hand */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              {t('game.cardsInHand', 'Cards in Hand')}
            </div>
            <div className="text-2xl font-bold text-white">{cardsPerPlayer}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GameScreen: React.FC = () => {
  const { t } = useTranslation();
  // Store Hooks
  const {
    gameState,

    myHand,
    myPlayerId,
    makeBet,
    throwCard,
    turnExpiresAt,
    leaveGame,
    lastError,
    clearError,
    tuzovanieCards,
    tuzovanieDealerIndex,
    showScoreSheet,
    setShowScoreSheet,
  } = useGameStore();

  const isMyTurn = useGameStore(selectIsMyTurn);
  const canMakeBet = useGameStore(selectCanMakeBet);
  const canThrowCard = useGameStore(selectCanThrowCard);

  // Derived State
  const humanPlayerCount = useMemo(() => {
    if (!gameState) return 0;
    return gameState.players.filter((p) => !p.isBot).length;
  }, [gameState]);

  const isTimerFrozen = humanPlayerCount <= 1;

  // Custom Hook for Telegram Viewport Height
  useEffect(() => {
    const setViewportHeight = () => {
      // Use window.innerHeight directly to avoid Telegram chrome issues
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    return () => window.removeEventListener('resize', setViewportHeight);
  }, []);

  // Memoized sorted hand to ensure correct order
  const sortedHand = useMemo(() => {
    if (!gameState) return [];
    return sortCards(myHand, gameState.trump);
  }, [myHand, gameState?.trump]);

  // Local State
  const [activeJokerCard, setActiveJokerCard] = useState<CardType | null>(null);
  const [isJokerModalOpen, setIsJokerModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  // isScoreSheetOpen replaced by global state
  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Event listener for scoring modal
  useEffect(() => {
    const handleOpenScoring = () => setIsScoringModalOpen(true);
    window.addEventListener('openScoringModal', handleOpenScoring);
    return () => window.removeEventListener('openScoringModal', handleOpenScoring);
  }, []);

  // Error Auto-Clear
  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => {
        clearError();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastError, clearError]);

  // Timer Logic
  useEffect(() => {
    if (!turnExpiresAt || isTimerFrozen) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((turnExpiresAt - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    // Initial call
    const now = Date.now();
    setTimeLeft(Math.max(0, Math.ceil((turnExpiresAt - now) / 1000)));

    return () => clearInterval(interval);
  }, [turnExpiresAt, isTimerFrozen]);

  // Loading State
  if (!gameState || !myPlayerId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1a472a] text-white">
        <div className="flex flex-col items-center gap-2 md:gap-4">
          <div className="h-8 w-8 md:h-12 md:w-12 animate-spin rounded-full border-4 border-white/20 border-t-amber-500" />
          <p className="animate-pulse text-sm md:text-lg font-medium tracking-wide">
            {t('game.loading')}
          </p>
        </div>
      </div>
    );
  }

  // Logic Helpers
  const handleCardClick = (card: CardType) => {
    if (!canThrowCard) return;

    // Check for Joker
    // @ts-ignore - Assuming type property exists based on Card.tsx logic
    if (card.type === 'joker') {
      setActiveJokerCard(card);
      setIsJokerModalOpen(true);
      return;
    }

    // Normal throw
    throwCard(card.id);
  };

  const handleJokerSelect = (option: JokerOption, requestedSuit?: Suit) => {
    if (activeJokerCard) {
      throwCard(activeJokerCard.id, option, requestedSuit);
      setIsJokerModalOpen(false);
      setActiveJokerCard(null);
    }
  };

  const handleBetSubmit = (amount: number) => {
    makeBet(amount);
  };

  // Calculate Lead Suit for Joker Modal
  const leadCard = gameState.table[0];
  let leadSuit: Suit | undefined;
  if (leadCard) {
    // @ts-ignore
    if (leadCard.card.type === 'joker') {
      leadSuit = leadCard.requestedSuit;
    } else {
      leadSuit = leadCard.card.suit;
    }
  }

  // Calculate Betting Info
  // Usually max bet is equal to number of cards in hand for the round
  const maxBet = gameState.cardsPerPlayer;

  const myBet = gameState.players.find((p) => p.id === myPlayerId)?.bet;
  const hasPlacedBet = myBet != null;
  const isModalOpen =
    isJokerModalOpen ||
    isLeaveModalOpen ||
    isInfoDrawerOpen ||
    isScoringModalOpen ||
    showScoreSheet ||
    (canMakeBet && !hasPlacedBet) ||
    gameState.phase === 'trump_selection';

  const otherPlayersBetsSum = useMemo(() => {
    if (gameState.phase !== 'betting') return undefined;
    return gameState.players
      .filter((p) => p.id !== myPlayerId)
      .map((p) => p.bet)
      .filter((bet): bet is number => bet !== null)
      .reduce((acc, bet) => acc + bet, 0);
  }, [gameState, myPlayerId]);

  const forbiddenBet = useMemo(() => {
    if (gameState.phase !== 'betting') return undefined;
    const myIndex = gameState.players.findIndex((p) => p.id === myPlayerId);
    if (myIndex === -1 || myIndex !== gameState.dealerIndex) return undefined;

    const currentBets = gameState.players.map((p) => p.bet);
    const otherBetsPlaced = currentBets.every((bet, index) => index === myIndex || bet !== null);
    if (!otherBetsPlaced) return undefined;

    const forbidden = calculateForbiddenBet(
      currentBets,
      gameState.cardsPerPlayer,
      myIndex,
      gameState.dealerIndex,
    );

    return forbidden ?? undefined;
  }, [gameState, myPlayerId]);

  // Determine current turn player name
  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];

  // Card Validation Logic
  // Memoize playable cards to avoid recalculating on every render
  const playableCards = useMemo(() => {
    if (!canThrowCard || !myHand.length) return [];
    return SharedMoveValidator.getValidCards(myHand, gameState.table, gameState.trump);
  }, [canThrowCard, myHand, gameState.table, gameState.trump]);

  // Validation Message Helper
  const getValidationMessage = (card: CardType): string | undefined => {
    if (!canThrowCard) return undefined;

    // If card is in playable list, it's valid
    if (playableCards.some((c) => c.id === card.id)) return undefined;

    // Analyze why it's invalid
    const result = SharedMoveValidator.validate(myHand, card, gameState.table, gameState.trump);

    if (result.reason === 'MUST_FOLLOW_SUIT') {
      return t('game.errors.mustFollow', { suit: result.requiredSuit });
    }
    if (result.reason === 'MUST_PLAY_TRUMP') {
      return t('game.errors.mustPlayTrump', { trump: result.requiredSuit });
    }

    return result.message || t('game.errors.invalidCard');
  };

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden bg-gradient-to-b from-[#1a472a] to-[#0d2616] text-slate-100"
      style={{ height: 'var(--tg-viewport-height, 100vh)' }}
    >
      {/* Error Banner */}
      {lastError && (
        <div className="absolute top-24 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300 max-w-md w-full">
            <div className="flex items-start gap-3 rounded-lg bg-red-900/95 border border-red-500/50 p-4 shadow-2xl backdrop-blur-md text-red-100 ring-1 ring-white/10">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                {lastError.code && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-0.5">
                    Error {lastError.code}
                  </span>
                )}
                <p className="text-sm font-medium leading-snug break-words">{lastError.message}</p>
              </div>
              <button
                onClick={clearError}
                className="flex-shrink-0 -mr-1 -mt-1 ml-2 rounded-lg p-1.5 hover:bg-red-800/50 text-red-300 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Texture - Classic Felt Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/felt.png')`,
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      {/* Top Bar removed - items moved to bottom right */}

      {/* Bottom Right Floating Action Group */}
      <div
        className={`absolute bottom-[25%] right-2 z-[110] flex flex-col items-end gap-3 pb-[env(safe-area-inset-bottom,20px)] ${isModalOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        {/* Timer - Moved from top right */}
        <div
          className={`flex items-center justify-center w-12 h-10 rounded-xl border backdrop-blur-sm transition-all duration-300 shadow-lg
          ${isMyTurn ? 'bg-gold/20 border-gold/50 animate-pulse-glow' : 'bg-black/60 border-white/10'}`}
        >
          <span
            className={`font-mono text-lg font-bold leading-none ${isMyTurn ? 'text-gold' : 'text-slate-300'}`}
          >
            {isTimerFrozen ? '--' : timeLeft.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Round Info - Moved from top left */}
        <button
          onClick={() => setIsInfoDrawerOpen(true)}
          className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10 hover:border-gold/30 transition-colors group h-10 shadow-lg"
        >
          <div className="flex flex-col items-end leading-none">
            <span className="text-[9px] text-slate-400 uppercase tracking-wide">
              {t('game.round')}
            </span>
            <span className="text-sm font-bold text-gold">{gameState.round}/24</span>
          </div>
        </button>

        {/* Score Sheet Button */}
        <button
          onClick={() => setShowScoreSheet(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-gold transition-colors backdrop-blur-sm shadow-lg shadow-black/30"
          title={t('game.scoreSheet', 'Score Sheet')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Menu / Leave Button */}
        <button
          onClick={() => setIsLeaveModalOpen(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-red-900/60 hover:bg-red-800/80 border border-red-700/50 text-red-200 transition-colors backdrop-blur-sm shadow-lg shadow-black/30"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 relative z-0 flex items-center justify-center pb-32">
        {' '}
        {/* Added padding bottom for hand */}
        <div className="h-full w-full relative">
          <Table
            players={gameState.players}
            tableCards={gameState.table}
            trump={gameState.trump}
            trumpCard={gameState.trumpCard}
            currentPlayerId={currentTurnPlayer?.id}
            myPlayerId={myPlayerId}
            dealerIndex={gameState.dealerIndex}
            className="w-full h-full z-10"
            isJokerTrump={!gameState.trump && gameState.trumpCard?.type === 'joker'}
            tuzovanieCards={tuzovanieCards}
            tuzovanieDealerIndex={tuzovanieDealerIndex}
          />
        </div>
      </div>

      {/* Bottom Player Hand */}
      <div className="absolute bottom-[15%] left-0 right-0 z-[95] flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,10px)]">
        <div className="w-full max-w-md px-2 pointer-events-auto overflow-visible">
          <Hand
            cards={sortedHand}
            onCardClick={handleCardClick}
            playableCards={playableCards}
            disabled={!canThrowCard}
            getValidationMessage={getValidationMessage}
            className={!canThrowCard ? 'opacity-80 saturate-50 scale-95 origin-bottom' : ''}
          />
        </div>
      </div>

      {/* Modals */}

      {/* Info Drawer */}
      <InfoDrawer
        isOpen={isInfoDrawerOpen}
        onClose={() => setIsInfoDrawerOpen(false)}
        round={gameState.round}
        cardsPerPlayer={gameState.cardsPerPlayer}
      />

      {/* Scoring Info Modal */}
      <ScoringInfoModal isOpen={isScoringModalOpen} onClose={() => setIsScoringModalOpen(false)} />

      {/* Betting Modal */}
      <BetModal
        isOpen={canMakeBet && !hasPlacedBet}
        onBet={handleBetSubmit}
        maxBet={maxBet}
        forbiddenBet={forbiddenBet}
        roundNumber={gameState.round}
        cardsInHand={gameState.cardsPerPlayer}
        otherPlayersBetsSum={otherPlayersBetsSum}
      />

      {/* Trump Selection Modal */}
      <TrumpSelectionModal />

      {/* Joker Options */}
      <JokerOptionModal
        isOpen={isJokerModalOpen}
        onSelect={handleJokerSelect}
        leadSuit={leadSuit}
        isLeading={gameState.table.length === 0}
      />

      {/* Leave Game Confirmation */}
      <LeaveGameModal
        isOpen={isLeaveModalOpen}
        onConfirm={() => {
          leaveGame();
          setIsLeaveModalOpen(false);
        }}
        onClose={() => setIsLeaveModalOpen(false)}
      />

      {/* Pulka Results Modal */}
      <PulkaResultsModal />

      {/* Score Sheet Modal */}
      {showScoreSheet && <HandwrittenScoreSheet onClose={() => setShowScoreSheet(false)} />}

      {/* Game Over / Victory Screen */}
      <VictoryScreen />

      {/* Legacy Game Over Modal (Fallback) */}
      <GameOverModal />

      {/* Dev Logs */}
      <DevLogPanel />
    </div>
  );
};

export default GameScreen;
