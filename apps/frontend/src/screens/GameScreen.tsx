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
import { GameProgressPanel } from '../components/GameProgressPanel';
import { ScoringInfoModal } from '../components/ScoringInfoModal';
import { JokerOptionModal } from '../components/JokerOptionModal';
import { LeaveGameModal } from '../components/LeaveGameModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import {
  PulkaResultsModal,
  TrumpSelectionModal,
  VictoryScreen,
  HandwrittenScoreSheet,
} from '../components/game';
import { GameOverModal } from '../components/GameOverModal';
import { DevLogPanel } from '../components/DevLogPanel';

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

  // Memoized sorted hand to ensure correct order
  const sortedHand = useMemo(() => {
    if (!gameState) return [];
    return sortCards(myHand, gameState.trump);
  }, [myHand, gameState?.trump]);

  // Local State
  const [activeJokerCard, setActiveJokerCard] = useState<CardType | null>(null);
  const [isJokerModalOpen, setIsJokerModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
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

  const myPlayer = gameState.players.find((p) => p.id === myPlayerId) || null;
  const hasPlacedBet = myPlayer?.bet !== null;

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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-[#1a472a] to-[#0d2616] text-slate-100">
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

      {/* Top Bar / HUD */}
      <div className="absolute top-0 left-0 right-0 z-40 flex flex-col md:flex-row items-start md:items-start justify-between p-2 md:p-4 gap-2 pointer-events-none">
        {/* Game Info - Compact on mobile */}
        <div className="hidden md:block">
          <GameProgressPanel currentRound={gameState.round} />
        </div>

        {/* Mobile: Compact top bar */}
        <div className="flex md:hidden w-full items-center justify-between pointer-events-auto">
          {/* Round indicator */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase">{t('game.round')}</span>
            <span className="text-sm font-bold text-amber-400">{gameState.round}/24</span>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm
            ${isMyTurn ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-black/40 border-white/10'}`}
          >
            <span
              className={`font-mono text-lg font-bold ${isMyTurn ? 'text-yellow-300' : 'text-slate-300'}`}
            >
              {isTimerFrozen ? '--' : timeLeft.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowScoreSheet(true)}
              className="p-2 rounded-lg bg-black/40 border border-white/10 text-amber-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="p-2 rounded-lg bg-red-900/80 border border-red-700 text-red-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414 5.414 6l3.293 3.293L13 5l1 2.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop: Timer & Phase */}
        <div className="hidden md:flex flex-col items-end gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="scale-75 origin-right" />
            <button
              onClick={() => setShowScoreSheet(true)}
              className="p-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-amber-400 transition-colors backdrop-blur-sm"
              title={t('game.scoreSheet', 'Score Sheet')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-700 text-red-100 text-[10px] font-bold uppercase tracking-widest transition-all shadow-md backdrop-blur-sm"
            >
              {t('lobby.leaveGame')}
            </button>
          </div>

          {/* Turn Indicator */}
          <div
            className={`
             flex items-center gap-4 px-6 py-2 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg
             ${
               isMyTurn
                 ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
                 : 'bg-black/40 border-white/10 text-slate-400'
             }
           `}
          >
            <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] uppercase tracking-[0.2em] mb-1 opacity-80">
                {isMyTurn ? t('game.yourAction') : t('game.waitingFor')}
              </span>
              <span className="font-bold text-lg">
                {isMyTurn ? t('game.yourTurn') : currentTurnPlayer?.name || t('game.opponent')}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-2xl font-bold leading-none">
                {isTimerFrozen ? '--' : timeLeft.toString().padStart(2, '0')}
              </span>
              <span className="text-[8px] uppercase tracking-wider opacity-60">
                {isTimerFrozen ? t('game.timerFrozen') : 'SEC'}
              </span>
            </div>
          </div>

          {/* Phase Badge */}
          <div className="px-3 py-1 rounded bg-black/40 border border-white/10 text-[10px] text-slate-300 uppercase tracking-[0.2em] backdrop-blur-sm shadow-sm">
            {t(`game.phase.${gameState.phase}`, gameState.phase)}
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 relative z-0 flex items-center justify-center pt-6 pb-20 md:py-10">
        <div className="h-full w-full max-w-7xl relative flex items-center justify-center px-2 md:px-0">
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
      <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center pb-1 md:pb-2 pointer-events-none">
        <div className="w-full max-w-5xl pointer-events-auto">
          <Hand
            cards={sortedHand}
            onCardClick={handleCardClick}
            playableCards={playableCards}
            disabled={!canThrowCard}
            getValidationMessage={getValidationMessage}
            className={!canThrowCard ? 'opacity-80 saturate-50 scale-95' : ''}
          />
        </div>

        {/* Helper Hint - Positioned above hand, responsive */}
        {isMyTurn && (
          <div className="absolute bottom-20 md:bottom-48 left-1/2 -translate-x-1/2 pointer-events-none z-40 animate-bounce">
            <span className="bg-yellow-500/90 text-black px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold border-2 border-yellow-300 shadow-lg tracking-wide uppercase">
              {t(`game.phase.${gameState.phase}`, gameState.phase)}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}

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
