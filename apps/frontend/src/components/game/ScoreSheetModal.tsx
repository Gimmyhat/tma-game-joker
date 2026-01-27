import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, RoundHistory } from '@joker/shared';
import { PlayerBadges } from '../PlayerBadges';

interface ScoreSheetModalProps {
  isOpen: boolean;
  onClose?: () => void; // Optional onClose for manual mode
  title?: React.ReactNode; // Custom title
  footer?: React.ReactNode; // Custom footer (e.g. timer)
  isPulkaResult?: boolean; // Styling flag
}

export const ScoreSheetModal: React.FC<ScoreSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  footer,
  isPulkaResult = false,
}) => {
  const { t } = useTranslation();
  const gameState = useGameStore((state) => state.gameState);

  const historyMap = useMemo(() => {
    if (!gameState) return new Map<number, RoundHistory>();
    return new Map(gameState.history.map((h) => [h.round, h]));
  }, [gameState?.history]);

  if (!isOpen || !gameState) return null;

  const getRoundData = (roundNumber: number, playerId: string) => {
    const roundHistory = historyMap.get(roundNumber);
    if (!roundHistory) return null;

    return {
      bet: roundHistory.bets[playerId],
      tricks: roundHistory.tricks[playerId],
      score: roundHistory.scores[playerId],
    };
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[90vh] bg-[#1a2c38] border ${isPulkaResult ? 'border-amber-500/50 shadow-amber-500/20' : 'border-[#2c3e50]'} rounded-xl shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0f172a] p-4 border-b border-[#2c3e50]">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            {title || (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-400"
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
                {t('game.scoreSheet', 'Таблица счета')}
              </>
            )}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-center border-collapse text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-md shadow-black/50">
              <tr>
                <th className="p-3 border-r border-[#2c3e50] w-12 text-gray-400 font-mono bg-[#0f172a]">
                  #
                </th>
                <th className="p-3 border-r border-[#2c3e50] w-12 text-gray-400 font-mono bg-[#0f172a]">
                  Cards
                </th>
                {gameState.players.map((player) => (
                  <th
                    key={player.id}
                    className="p-3 border-r border-[#2c3e50] min-w-[100px] bg-[#0f172a]"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-100 truncate max-w-[120px]">
                          {player.name}
                        </span>
                        {player.badges && <PlayerBadges badges={player.badges} size="sm" />}
                      </div>
                      <span className="text-[11px] text-amber-500 font-mono mt-1 px-2 py-0.5 rounded bg-amber-950/30 border border-amber-900/50">
                        {player.totalScore} pts
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c3e50]">
              {GAME_CONSTANTS.PULKA_STRUCTURE.map((pulka) => (
                <React.Fragment key={pulka.pulka}>
                  <td
                    colSpan={2 + gameState.players.length}
                    className="p-2 text-center border-t border-b border-[#2c3e50]"
                  >
                    — Pulka {pulka.pulka} —
                  </td>

                  {/* Rounds */}
                  {pulka.rounds.map((roundNum, idx) => {
                    const cardsCount = pulka.cardsPerRound[idx];
                    const isCurrentRound = roundNum === gameState.round;
                    const isPastRound = roundNum < gameState.round;

                    return (
                      <tr
                        key={roundNum}
                        className={`
                          ${isCurrentRound ? 'bg-amber-500/10' : 'hover:bg-white/5'} 
                          ${!isPastRound && !isCurrentRound ? 'opacity-30 grayscale' : ''}
                          transition-colors duration-200
                        `}
                      >
                        <td className="p-2 border-r border-[#2c3e50] font-mono text-gray-500">
                          {roundNum}
                        </td>
                        <td className="p-2 border-r border-[#2c3e50] font-mono font-bold text-gray-400">
                          {cardsCount}
                        </td>

                        {gameState.players.map((player) => {
                          const data = getRoundData(roundNum, player.id);

                          if (!data) {
                            return (
                              <td
                                key={player.id}
                                className="p-2 border-r border-[#2c3e50] text-gray-700"
                              >
                                -
                              </td>
                            );
                          }

                          const isShtanga = data.bet > 1 && data.tricks === 0;
                          const isBonus = data.score > 0;

                          return (
                            <td key={player.id} className="p-2 border-r border-[#2c3e50]">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-3 text-xs font-mono bg-black/20 rounded px-2 py-1 min-w-[60px]">
                                  <span
                                    className={`w-3 text-right ${data.bet === data.tricks ? 'text-amber-200' : 'text-blue-300'}`}
                                  >
                                    {data.bet ?? '-'}
                                  </span>
                                  <span className="text-gray-600 opacity-50">|</span>
                                  <span
                                    className={`w-3 text-left ${data.bet === data.tricks ? 'text-amber-200' : 'text-emerald-300'}`}
                                  >
                                    {data.tricks ?? '-'}
                                  </span>
                                </div>
                                <div
                                  className={`font-bold text-sm ${isShtanga ? 'text-red-500 animate-pulse' : isBonus ? 'text-emerald-400' : 'text-gray-400'}`}
                                >
                                  {data.score > 0 ? `+${data.score}` : data.score}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Premium Row (if this pulka is finished) */}
                  {gameState.lastPulkaResults &&
                    gameState.lastPulkaResults.pulka === pulka.pulka && (
                      <tr className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-t-2 border-indigo-500/30">
                        <td
                          colSpan={2}
                          className="p-3 text-right font-bold text-indigo-300 text-xs uppercase tracking-wider border-r border-[#2c3e50]"
                        >
                          Premiums
                        </td>
                        {gameState.players.map((player) => {
                          const premiumScore =
                            gameState.lastPulkaResults?.playerScores[player.id] || 0;
                          const hasPremium = premiumScore !== 0;
                          return (
                            <td key={player.id} className="p-3 border-r border-[#2c3e50]">
                              {hasPremium && (
                                <div
                                  className={`font-bold text-lg ${premiumScore > 0 ? 'text-emerald-300 drop-shadow-glow-green' : 'text-red-400'}`}
                                >
                                  {premiumScore > 0 ? `+${premiumScore}` : premiumScore}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {footer && <div className="bg-[#0f172a] p-4 border-t border-[#2c3e50]">{footer}</div>}
      </div>
    </div>
  );
};
