import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, ScoreSheetRoundEntry, PulkaSummary } from '@joker/shared';

interface HandwrittenScoreSheetProps {
  onClose: () => void;
}

export const HandwrittenScoreSheet: React.FC<HandwrittenScoreSheetProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { gameState, finalResults } = useGameStore();

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
      // This is a simplified frontend calculation
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

        // Cumulative (approximate from p.pulkaScores if available)
        // p.pulkaScores[structure.pulka - 1] might exist
        const cumulativeTotal = p.pulkaScores[structure.pulka - 1] ?? 0;

        return {
          pulkaNumber: structure.pulka,
          rounds,
          pulkaAverage: avg,
          cumulativeTotal, // This might be 0 if pulka not finished
          premiumScore: 0, // Hard to calc on frontend without logic duplication
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

  // Sort players by seat index for the table columns (as per requirement "sorted by original seat position")
  // Actually, usually table columns are fixed by seat order.
  const tablePlayers = [...displayData.players].sort((a, b) => a.seatIndex - b.seatIndex);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[90vh] bg-[#fdfbf7] text-blue-900 rounded-lg shadow-2xl overflow-hidden flex flex-col relative font-handwritten">
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

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 border-b-2 border-blue-900/30">
          <h2 className="text-3xl font-bold text-blue-800 tracking-wide">
            {t('game.scoreSheet', 'Лист счета')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-50 rounded-full text-blue-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
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
        </div>

        {/* Scrollable Table Container */}
        <div className="flex-1 overflow-auto relative z-10 p-2 sm:p-4 custom-scrollbar">
          <div className="min-w-[600px] mx-auto bg-white/50 shadow-sm border-2 border-blue-900/50">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr>
                  <th className="w-12 border-r-2 border-b-2 border-blue-900/50 p-2 bg-blue-50/50"></th>
                  <th className="w-8 border-r-2 border-b-2 border-blue-900/50 p-2 bg-blue-50/50 text-xs">
                    N
                  </th>
                  {tablePlayers.map((player) => (
                    <th
                      key={player.id}
                      className="border-r-2 border-b-2 border-blue-900/50 p-2 min-w-[100px]"
                    >
                      <div className="text-xl font-bold">{player.name}</div>
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
                        <td className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-1 text-lg font-bold text-blue-800/70">
                          {roundNum}
                        </td>
                        <td className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-1 text-sm text-gray-500">
                          {pulka.cardsPerRound[roundIdx]}
                        </td>
                        {tablePlayers.map((player) => {
                          const roundData = player.pulkaSummaries[pulkaIdx].rounds[roundIdx];
                          if (!roundData || roundData.bid === null) {
                            return (
                              <td
                                key={player.id}
                                className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-1"
                              >
                                <div className="h-8"></div>
                              </td>
                            );
                          }

                          const bidText = roundData.bid === 0 ? '-' : roundData.bid;
                          const scoreText = roundData.score === -200 ? '—' : roundData.score;

                          return (
                            <td
                              key={player.id}
                              className="border-r-2 border-blue-900/30 border-b border-blue-900/20 p-0 relative"
                            >
                              <div className="flex h-full min-h-[32px] items-center">
                                {/* Bid Column */}
                                <div className="flex-1 text-right pr-2 text-lg font-medium border-r border-blue-900/30 h-full flex items-center justify-end">
                                  {bidText}
                                  {roundData.bidMade && roundData.bid !== 0 && (
                                    <span className="ml-0.5 text-blue-900">•</span>
                                  )}
                                </div>

                                {/* Joker Dots on the line */}
                                {roundData.jokerCount > 0 && (
                                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-10">
                                    {Array.from({ length: roundData.jokerCount }).map((_, i) => (
                                      <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-blue-900"
                                      ></div>
                                    ))}
                                  </div>
                                )}

                                {/* Score Column */}
                                <div className="flex-1 text-left pl-2 text-xl font-bold">
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
                        className="border-r-2 border-blue-900/50 p-1 text-center font-bold text-2xl"
                      >
                        X
                      </td>
                      {tablePlayers.map((player) => {
                        const summary = player.pulkaSummaries[pulkaIdx];
                        return (
                          <td
                            key={player.id}
                            className="border-r-2 border-blue-900/50 p-1 text-center text-xl font-bold"
                          >
                            {summary.rounds.some((r) => r.bid !== null) ? summary.pulkaAverage : ''}
                          </td>
                        );
                      })}
                    </tr>,
                  );

                  // Cumulative Row
                  pulkaRows.push(
                    <tr key={`p-${pulka.pulka}-cum`} className="border-b-4 border-blue-900/80">
                      <td colSpan={2} className="border-r-2 border-blue-900/50 bg-blue-50/50"></td>
                      {tablePlayers.map((player) => {
                        const summary = player.pulkaSummaries[pulkaIdx];
                        const hasPlayed = summary.rounds.some((r) => r.bid !== null);
                        return (
                          <td
                            key={player.id}
                            className="border-r-2 border-blue-900/50 p-2 text-center text-2xl font-black text-blue-900"
                          >
                            {hasPlayed ? summary.cumulativeTotal : ''}
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
                      className="border-r-2 border-blue-900/50 p-4 font-bold text-lg text-right"
                    >
                      {t('game.matchResults', 'Итог')}
                    </td>
                    {tablePlayers.map((player) => {
                      const placeRoman = ['I', 'II', 'III', 'IV'][player.place - 1];
                      const isWinner = player.place === 1;

                      return (
                        <td
                          key={player.id}
                          className="border-r-2 border-blue-900/50 p-4 text-center"
                        >
                          <div className="flex flex-col items-center gap-1">
                            {isWinner && <div className="text-3xl mb-1">👑</div>}
                            <div className="text-4xl font-black font-serif text-blue-900">
                              {placeRoman}
                            </div>
                            <div className="text-sm font-bold uppercase tracking-wider opacity-60">
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
      </div>
    </div>
  );
};
