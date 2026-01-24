import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store';
import {
  selectIsMyTurn,
  selectCanMakeBet,
  selectCanThrowCard,
  selectCanSelectTrump,
} from '../store/gameStore';
import { Card as CardType, JokerOption, Suit } from '@joker/shared';
import Table from '../components/Table';
import Hand from '../components/Hand';
import { BetModal } from '../components/BetModal';
import { TrumpSelector } from '../components/TrumpSelector';
import { GameProgressPanel } from '../components/GameProgressPanel';
import { ScoringInfoModal } from '../components/ScoringInfoModal';
import { JokerOptionModal } from '../components/JokerOptionModal';
import { LeaveGameModal } from '../components/LeaveGameModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PulkaResultsModal } from '../components/game';
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
    selectTrump,
    turnExpiresAt,
    leaveGame,
    lastError,
    clearError,
  } = useGameStore();

  const isMyTurn = useGameStore(selectIsMyTurn);
  const canMakeBet = useGameStore(selectCanMakeBet);
  const canThrowCard = useGameStore(selectCanThrowCard);
  const canSelectTrump = useGameStore(selectCanSelectTrump);

  // Local State
  const [activeJokerCard, setActiveJokerCard] = useState<CardType | null>(null);
  const [isJokerModalOpen, setIsJokerModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
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
    if (!turnExpiresAt) {
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
  }, [turnExpiresAt]);

  // Loading State
  if (!gameState || !myPlayerId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#1a472a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-amber-500" />
          <p className="animate-pulse text-lg font-medium tracking-wide">{t('game.loading')}</p>
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

    const otherBets = gameState.players
      .filter((p) => p.id !== myPlayerId)
      .map((p) => p.bet)
      .filter((bet): bet is number => bet !== null);

    if (otherBets.length !== gameState.players.length - 1) return undefined;

    const sum = otherBets.reduce((acc, bet) => acc + bet, 0);
    const forbidden = gameState.cardsPerPlayer - sum;

    if (forbidden < 0 || forbidden > gameState.cardsPerPlayer) return undefined;
    return forbidden;
  }, [gameState, myPlayerId]);

  // Determine current turn player name
  const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];

  // Card Validation Logic
  // Memoize playable cards to avoid recalculating on every render
  const playableCards = useMemo(() => {
    if (!canThrowCard || !myHand.length) return [];

    // If I am leading (table is empty), all cards are playable
    if (gameState.table.length === 0) return myHand;

    // Logic for following suit
    const leadCard = gameState.table[0];
    let leadSuit: Suit | undefined;

    // @ts-ignore - Assuming type property exists
    if (leadCard.card.type === 'joker') {
      leadSuit = leadCard.requestedSuit;
    } else {
      leadSuit = leadCard.card.suit;
    }

    if (!leadSuit) return myHand; // Should not happen if table not empty

    // Check if I have lead suit (excluding Joker)
    // @ts-ignore
    const hasLeadSuit = myHand.some((c) => c.type !== 'joker' && c.suit === leadSuit);

    if (hasLeadSuit) {
      // Must play lead suit or Joker
      // @ts-ignore
      return myHand.filter((c) => c.type === 'joker' || c.suit === leadSuit);
    }

    // If I don't have lead suit, check for Trump
    const trump = gameState.trump;
    if (trump) {
      // @ts-ignore
      const hasTrump = myHand.some((c) => c.type !== 'joker' && c.suit === trump);
      if (hasTrump) {
        // Must play trump or Joker
        // @ts-ignore
        return myHand.filter((c) => c.type === 'joker' || c.suit === trump);
      }
    }

    // If no lead suit and no trump (or no trump in hand), can play anything
    return myHand;
  }, [canThrowCard, myHand, gameState.table, gameState.trump]);

  // Validation Message Helper
  const getValidationMessage = (card: CardType): string | undefined => {
    if (!canThrowCard) return undefined;

    // If card is in playable list, it's valid
    if (playableCards.some((c) => c.id === card.id)) return undefined;

    // Analyze why it's invalid
    if (gameState.table.length > 0) {
      const leadCard = gameState.table[0];
      let leadSuit: Suit | undefined;
      // @ts-ignore
      if (leadCard.card.type === 'joker') leadSuit = leadCard.requestedSuit;
      else leadSuit = leadCard.card.suit;

      // @ts-ignore
      const hasLeadSuit = myHand.some((c) => c.type !== 'joker' && c.suit === leadSuit);

      // @ts-ignore
      if (hasLeadSuit && card.suit !== leadSuit && card.type !== 'joker') {
        return t('game.errors.mustFollow', { suit: leadSuit });
      }

      const trump = gameState.trump;
      // @ts-ignore
      const hasTrump = trump && myHand.some((c) => c.type !== 'joker' && c.suit === trump);
      // @ts-ignore
      if (!hasLeadSuit && hasTrump && card.suit !== trump && card.type !== 'joker') {
        return t('game.errors.mustPlayTrump', { trump });
      }
    }

    return t('game.errors.invalidCard');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-[#1a472a] to-[#0d2616] text-slate-100">
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
      <div className="absolute top-0 left-0 right-0 z-40 flex items-start justify-between p-4 pointer-events-none">
        {/* Game Info - REPLACED with GameProgressPanel */}
        <GameProgressPanel currentRound={gameState.round} />

        {/* Timer & Phase */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="scale-75 origin-right" />
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
                {timeLeft.toString().padStart(2, '0')}
              </span>
              <span className="text-[8px] uppercase tracking-wider opacity-60">SEC</span>
            </div>
          </div>

          {/* Phase Badge */}
          <div className="px-3 py-1 rounded bg-black/40 border border-white/10 text-[10px] text-slate-300 uppercase tracking-[0.2em] backdrop-blur-sm shadow-sm">
            {t(`game.phase.${gameState.phase}`, gameState.phase)}
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 relative z-0 flex items-center justify-center py-10">
        {/* We use perspective to give a slight 3D feel if we want, or just flat for now */}
        <div className="w-full max-w-7xl aspect-[16/9] relative flex items-center justify-center">
          <Table
            players={gameState.players}
            tableCards={gameState.table}
            trump={gameState.trump}
            currentPlayerId={currentTurnPlayer?.id}
            myPlayerId={myPlayerId}
            className="w-[85%] h-[65%] z-10" // Sizing relative to container
            // @ts-ignore - gameState.trumpCard might not exist in type but standard joker has it
            isJokerTrump={!gameState.trump && gameState.trumpCard?.type === 'joker'}
          />
        </div>
      </div>

      {/* Bottom Player Hand */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-2 pointer-events-none">
        <div className="w-full max-w-5xl pointer-events-auto">
          <Hand
            cards={myHand}
            onCardClick={handleCardClick}
            playableCards={playableCards}
            disabled={!canThrowCard}
            getValidationMessage={getValidationMessage}
            className={!canThrowCard ? 'opacity-80 saturate-50 scale-95' : ''}
          />
        </div>

        {/* Helper Hint */}
        {isMyTurn && (
          <div className="absolute bottom-48 left-1/2 -translate-x-1/2 pointer-events-none z-40 animate-bounce">
            <span className="bg-yellow-500/90 text-black px-6 py-2 rounded-full text-sm font-bold border-2 border-yellow-300 shadow-lg tracking-wide uppercase">
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

      {/* Trump Selector */}
      <TrumpSelector
        isOpen={canSelectTrump}
        onSelect={selectTrump}
        // @ts-ignore
        isJokerTrump={!gameState.trump && gameState.trumpCard?.type === 'joker'}
      />

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

      {/* Dev Logs */}
      <DevLogPanel />
    </div>
  );
};

export default GameScreen;
