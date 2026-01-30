import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, ScoreSheetRoundEntry, PulkaSummary } from '@joker/shared';

interface HandwrittenScoreSheetProps {
  onClose?: () => void;
  isOpen?: boolean; // Added for compatibility with ScoreSheetModal interface
  isPulkaResult?: boolean; // Ignored, but kept for interface compatibility
  title?: React.ReactNode;
  footer?: React.ReactNode;
}

export const HandwrittenScoreSheet: React.FC<HandwrittenScoreSheetProps> = ({
  onClose,
  title,
  footer,
}) => {
  const { t } = useTranslation();
  const { gameState, finalResults } = useGameStore();

  // Swipe handling state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current || !onClose) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Detect horizontal swipe (left or right)
    // Threshold: 50px, and horizontal movement must be significantly larger than vertical
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      onClose();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Prepare data for rendering
  const displayData = useMemo(() => {
    if (finalResults) {
      return {
        players: finalResults.rankings.map((r) => ({
          id: r.playerId,
          name: r.playerName,
          place: r.place,
          totalScore: r.totalScore,
          pulkaSummaries: r.pulkaSummaries,
          seatIndex: r.seatIndex,
        })),
        isFinal: true,
      };
    }

    if (!gameState) return null;

    // Compute mock summaries from current game state for live view
    const players = gameState.players.map((p, index) => {
      // Need to compute per-pulka summaries
      const pulkaSummaries: PulkaSummary[] = GAME_CONSTANTS.PULKA_STRUCTURE.map((structure) => {
        const rounds: ScoreSheetRoundEntry[] = structure.rounds.map((roundNum, idx) => {
          const history = gameState.history.find((h) => h.round === roundNum);
          if (history) {
            const bet = history.bets[p.id];
            const tricks = history.tricks[p.id];
            const score = history.scores[p.id];
            const jokerCount = history.jokerCounts?.[p.id] ?? 0;

            return {
              roundNumber: roundNum,
              cardsPerPlayer: history.cardsPerPlayer,
              bid: bet,
              bidMade: bet !== null && tricks !== null && bet === tricks,
              tricks: tricks ?? 0,
              score: score ?? 0,
              jokerCount: jokerCount as 0 | 1 | 2,
            };
          }
          return {
            roundNumber: roundNum,
            cardsPerPlayer: structure.cardsPerRound[idx],
            bid: null,
            bidMade: false,
            tricks: 0,
            score: 0,
            jokerCount: 0,
          };
        });

        // Calculate average
        const completedRounds = rounds.filter((r) => r.bid !== null);
        const sum = completedRounds.reduce((acc, r) => acc + r.score, 0);
        const avg =
          completedRounds.length > 0 ? Number((sum / completedRounds.length).toFixed(1)) : 0;

        // Cumulative
        const pulkaIdx = structure.pulka - 1;
        const currentPulkaTotal = p.pulkaScores[pulkaIdx];
        const cumulativeTotal = currentPulkaTotal ?? 0;

        // Calculate premium (Frontend Calculation)
        let premiumScore = 0;
        if (currentPulkaTotal !== undefined) {
          const prevPulkaTotal = pulkaIdx > 0 ? (p.pulkaScores[pulkaIdx - 1] ?? 0) : 0;
          const totalGained = currentPulkaTotal - prevPulkaTotal;
          const roundScoresSum = rounds.reduce((s, r) => s + r.score, 0);
          premiumScore = totalGained - roundScoresSum;
        }

        return {
          pulkaNumber: structure.pulka,
          rounds,
          pulkaAverage: avg,
          cumulativeTotal: currentPulkaTotal !== undefined ? cumulativeTotal : 0, // Only show if calculated
          premiumScore,
        };
      });

      return {
        id: p.id,
        name: p.name,
        place: 0 as 1 | 2 | 3 | 4, // Unknown during game
        totalScore: p.totalScore,
        pulkaSummaries,
        seatIndex: index,
      };
    });

    return { players, isFinal: false };
  }, [gameState, finalResults]);

  if (!displayData) return null;

  // Sort players by seat index for the table columns
  const tablePlayers = [...displayData.players].sort((a, b) => a.seatIndex - b.seatIndex);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-1 sm:p-2 md:p-4 animate-in fade-in duration-300"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="w-full max-w-5xl h-[95vh] md:h-[90vh] bg-[#fdfbf7] text-blue-900 rounded-lg shadow-2xl overflow-hidden flex flex-col relative font-handwritten"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking content
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-50 z-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]" />

        {/* Grid Lines Pattern */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(#0000ff 1px, transparent 1px), linear-gradient(90deg, #0000ff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Header - Compact on mobile */}
        <div className="relative z-10 flex items-center justify-between p-2 md:p-4 border-b-2 border-blue-900/30">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 md:p-2 hover:bg-blue-50 rounded-full text-blue-800 transition-colors mr-2"
              aria-label={t('common.close', 'Close')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 md:h-8 md:w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          <h2 className="text-xl md:text-3xl font-bold text-blue-800 tracking-wide flex-1 text-center">
            {title || t('game.scoreSheet', 'Лист счета')}
          </h2>
          <div className="w-8 md:w-10" /> {/* Spacer to balance the header */}
        </div>

        {/* Scrollable Table Container */}
        <div className="flex-1 overflow-auto relative z-10 p-1 sm:p-2 md:p-4 custom-scrollbar">
          <div className="min-w-full mx-auto bg-white/50 shadow-sm border-2 border-blue-900/50">
            <table className="w-full border-collapse text-center text-xs md:text-base table-fixed">
              <thead>
                <tr>
                  <th className="w-6 border-r-2 border-b-2 border-blue-900/50 p-1 bg-blue-50/50"></th>
                  <th className="w-6 border-r-2 border-b-2 border-blue-900/50 p-1 bg-blue-50/50 text-[10px]">
                    N
                  </th>
                  {tablePlayers.map((player) => (
                    <th
                      key={player.id}
                      className="border-r-2 border-b-2 border-blue-900/50 p-1 relative h-[100px] align-bottom"
                    >
                      <div className="absolute bottom-1 left-1 origin-bottom-left transform -rotate-45 translate-x-2 -translate-y-1 w-[130px] pointer-events-none">
                        <div className="truncate text-[10px] sm:text-xs font-bold text-blue-900 text-left">
                          {player.name}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GAME_CONSTANTS.PULKA_STRUCTURE.map((pulka, pulkaIdx) => {
                  const pulkaRows: React.ReactNode[] = [];

                  // Add rounds
                  pulka.rounds.forEach((roundNum, roundIdx) => {
                    pulkaRows.push(
                      <tr key={`r-${roundNum}`} className="hover:bg-blue-50/30">
                        <td className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-0.5 text-xs font-bold text-blue-800/70 text-center">
                          {roundNum}
                        </td>
                        <td className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-0.5 text-[10px] text-gray-500 text-center">
                          {pulka.cardsPerRound[roundIdx]}
                        </td>
                        {tablePlayers.map((player) => {
                          const roundData = player.pulkaSummaries[pulkaIdx].rounds[roundIdx];
                          if (!roundData || roundData.bid === null) {
                            return (
                              <td
                                key={player.id}
                                className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-0.5"
                              >
                                <div className="h-6"></div>
                              </td>
                            );
                          }

                          const bidText = roundData.bid === 0 ? '-' : roundData.bid;
                          const scoreText = roundData.score === -200 ? '—' : roundData.score;

                          // Markers logic
                          const isSpoiled =
                            roundData.bid !== null && roundData.tricks < roundData.bid;
                          const isOver = roundData.bid !== null && roundData.tricks > roundData.bid;

                          return (
                            <td
                              key={player.id}
                              className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-0 relative"
                            >
                              <div className="flex h-full min-h-[24px] items-center text-xs">
                                {/* Bid Column - Narrower */}
                                <div className="w-[35%] text-right pr-1 font-medium border-r border-blue-900/30 h-full flex items-center justify-end relative">
                                  {bidText}
                                  {/* Status Markers */}
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center leading-none">
                                    {roundData.bidMade && roundData.bid !== 0 && (
                                      <span className="text-blue-900 text-[8px] leading-none">
                                        •
                                      </span>
                                    )}
                                    {isOver && (
                                      <span className="text-emerald-600 text-[8px] leading-none">
                                        ●
                                      </span>
                                    )}
                                    {isSpoiled && (
                                      <span className="text-red-600 text-[8px] font-bold leading-none">
                                        ✗
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Joker Stars on the line */}
                                {roundData.jokerCount > 0 && (
                                  <div className="absolute left-[35%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-10 bg-[#fdfbf7]/80 rounded-sm">
                                    {Array.from({ length: roundData.jokerCount }).map((_, i) => (
                                      <span
                                        key={i}
                                        className="text-[8px] leading-none text-amber-600 drop-shadow-sm"
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Score Column */}
                                <div
                                  className={`flex-1 text-center font-bold ${isSpoiled ? 'text-red-800/70' : ''} ${isOver ? 'text-emerald-800/80' : ''}`}
                                >
                                  {scoreText}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>,
                    );
                  });

                  // Pulka Divider Row (Average)
                  pulkaRows.push(
                    <tr
                      key={`p-${pulka.pulka}-avg`}
                      className="bg-blue-100/30 border-t-2 border-b-2 border-blue-900/50"
                    >
                      <td
                        colSpan={2}
                        className="border-r-2 border-blue-900/50 p-0.5 text-center font-bold text-sm"
                      >
                        X
                      </td>
                      {tablePlayers.map((player) => {
                        const summary = player.pulkaSummaries[pulkaIdx];
                        return (
                          <td
                            key={player.id}
                            className="border-r-2 border-blue-900/50 p-0.5 text-center text-xs font-bold"
                          >
                            {summary.rounds.some((r) => r.bid !== null) ? summary.pulkaAverage : ''}
                          </td>
                        );
                      })}
                    </tr>,
                  );

                  // Premium Row
                  // Only show if pulka is finished (has cumulative total)
                  const isPulkaFinished = tablePlayers.some(
                    (p) =>
                      p.pulkaSummaries[pulkaIdx].cumulativeTotal !== 0 ||
                      p.pulkaSummaries[pulkaIdx].premiumScore !== 0,
                  );

                  if (isPulkaFinished) {
                    pulkaRows.push(
                      <tr
                        key={`p-${pulka.pulka}-prem`}
                        className="bg-green-50/50 border-b-2 border-blue-900/50"
                      >
                        <td
                          colSpan={2}
                          className="border-r-2 border-blue-900/50 p-0.5 text-center font-bold text-xs text-emerald-700"
                        >
                          Prem
                        </td>
                        {tablePlayers.map((player) => {
                          const summary = player.pulkaSummaries[pulkaIdx];
                          const premium = summary.premiumScore;
                          const hasPremium = premium !== 0;

                          return (
                            <td
                              key={player.id}
                              className="border-r-2 border-blue-900/50 p-0.5 text-center text-xs font-bold"
                            >
                              {hasPremium && (
                                <span className={premium > 0 ? 'text-emerald-600' : 'text-red-500'}>
                                  {premium > 0 ? `+${premium}` : premium}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>,
                    );
                  }

                  // Cumulative Row
                  pulkaRows.push(
                    <tr key={`p-${pulka.pulka}-cum`} className="border-b-4 border-blue-900/80">
                      <td colSpan={2} className="border-r-2 border-blue-900/50 bg-blue-50/50"></td>
                      {tablePlayers.map((player) => {
                        const summary = player.pulkaSummaries[pulkaIdx];
                        const hasPlayed = summary.rounds.some((r) => r.bid !== null);
                        // Also show if we have a cumulative total (e.g. from premiums)
                        const showTotal = hasPlayed || summary.cumulativeTotal !== 0;

                        return (
                          <td
                            key={player.id}
                            className="border-r-2 border-blue-900/50 p-1 text-center text-sm font-black text-blue-900"
                          >
                            {showTotal ? summary.cumulativeTotal : ''}
                          </td>
                        );
                      })}
                    </tr>,
                  );

                  return pulkaRows;
                })}

                {/* Final Results Row */}
                {displayData.isFinal && (
                  <tr className="bg-amber-50/50">
                    <td
                      colSpan={2}
                      className="border-r-2 border-blue-900/50 p-2 font-bold text-xs text-right"
                    >
                      {t('game.matchResults', 'Итог')}
                    </td>
                    {tablePlayers.map((player) => {
                      const placeRoman = ['I', 'II', 'III', 'IV'][player.place - 1];
                      const isWinner = player.place === 1;

                      return (
                        <td
                          key={player.id}
                          className="border-r-2 border-blue-900/50 p-2 text-center"
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {isWinner && <div className="text-lg mb-0.5">👑</div>}
                            <div className="text-xl font-black font-serif text-blue-900">
                              {placeRoman}
                            </div>
                            <div className="text-[8px] font-bold uppercase tracking-wider opacity-60 truncate max-w-[60px]">
                              {player.name}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer (Timer etc) */}
        <div className="relative z-10 bg-[#fdfbf7] p-2 md:p-4 border-t-2 border-blue-900/30 flex flex-col gap-2">
          {footer && <div className="flex justify-center">{footer}</div>}

          {onClose && (
            <button
              onClick={onClose}
              className="w-full bg-blue-900/10 hover:bg-blue-900/20 active:bg-blue-900/30 text-blue-900 font-bold py-3 rounded-lg transition-colors border-2 border-blue-900/20 flex items-center justify-center gap-2"
            >
              <span>{t('common.close', 'Закрыть')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
