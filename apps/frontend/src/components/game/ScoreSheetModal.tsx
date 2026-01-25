import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS, RoundHistory } from '@joker/shared';

interface ScoreSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoreSheetModal: React.FC<ScoreSheetModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const gameState = useGameStore((state) => state.gameState);

  const historyMap = useMemo(() => {
    if (!gameState) return new Map<number, RoundHistory>();
    return new Map(gameState.history.map((h) => [h.round, h]));
  }, [gameState?.history]);

  if (!isOpen || !gameState) return null;

  // Helper to get score for a specific round and player
  const getRoundData = (roundNumber: number, playerId: string) => {
    const roundHistory = historyMap.get(roundNumber);
    if (!roundHistory) return null;

    return {
      bet: roundHistory.bets[playerId],
      tricks: roundHistory.tricks[playerId],
      score: roundHistory.scores[playerId],
    };
  };

  // Helper to get accumulated score up to a specific round
  // Note: The history stores individual round scores. We might need to sum them up
  // if we want to show running total. The image typically shows running total in some versions,
  // or just round score. Let's assume round score for now as per history structure,
  // but usually players want to see their Total Score.
  // The GameState has players[].totalScore, which is current.
  // To show historical running total, we'd need to re-calculate.
  // Let's just show the Round Score for now, as that's what's recorded.
  // The image shows large numbers (-200, 100), which are definitely single round scores
  // (Shtanga = -200, Take All 1 card = 100).
  // So Round Score is correct.

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#1a2c38] border border-[#2c3e50] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0f172a] p-4 border-b border-[#2c3e50]">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
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
          </h2>
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
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-center border-collapse text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-md">
              <tr>
                <th className="p-2 border-r border-[#2c3e50] w-12 text-gray-400 font-mono">#</th>
                <th className="p-2 border-r border-[#2c3e50] w-12 text-gray-400 font-mono">
                  Cards
                </th>
                {gameState.players.map((player) => (
                  <th
                    key={player.id}
                    className="p-2 border-r border-[#2c3e50] min-w-[80px] text-gray-200"
                  >
                    <div className="truncate max-w-[100px] mx-auto">{player.name}</div>
                    <div className="text-[10px] text-amber-500 font-mono mt-1">
                      Total: {player.totalScore}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c3e50]">
              {GAME_CONSTANTS.PULKA_STRUCTURE.map((pulka, pulkaIndex) => (
                <React.Fragment key={pulka.pulka}>
                  {/* Pulka Header/Separator */}
                  {pulkaIndex > 0 && (
                    <tr className="bg-[#0f172a]/80 text-[#amber-500] font-bold text-xs">
                      <td
                        colSpan={2 + gameState.players.length}
                        className="p-1 text-center border-t border-b border-[#2c3e50] text-amber-500/50 uppercase tracking-widest"
                      >
                        Pulka {pulka.pulka}
                      </td>
                    </tr>
                  )}

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
                          ${!isPastRound && !isCurrentRound ? 'opacity-40' : ''}
                          transition-colors
                        `}
                      >
                        <td className="p-2 border-r border-[#2c3e50] font-mono text-gray-500">
                          {roundNum}
                        </td>
                        <td className="p-2 border-r border-[#2c3e50] font-mono font-bold text-gray-300">
                          {cardsCount}
                        </td>

                        {gameState.players.map((player) => {
                          const data = getRoundData(roundNum, player.id);

                          if (!data) {
                            return (
                              <td key={player.id} className="p-2 border-r border-[#2c3e50]">
                                -
                              </td>
                            );
                          }

                          const isShtanga = data.bet > 1 && data.tricks === 0;
                          const isBonus = data.score > 0;

                          return (
                            <td key={player.id} className="p-2 border-r border-[#2c3e50]">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-2 text-xs font-mono">
                                  <span className="text-blue-300 w-4 text-right">
                                    {data.bet ?? '-'}
                                  </span>
                                  <span className="text-gray-600">|</span>
                                  <span className="text-emerald-300 w-4 text-left">
                                    {data.tricks ?? '-'}
                                  </span>
                                </div>
                                <div
                                  className={`font-bold ${isShtanga ? 'text-red-500' : isBonus ? 'text-emerald-400' : 'text-gray-400'}`}
                                >
                                  {data.score !== undefined ? data.score : ''}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Pulka Results (Premiums) - if available */}
                  {/* NOTE: We don't have historical pulka results stored easily in GameState 
                      except for lastPulkaResults. 
                      However, we can calculate running totals or just leave this placeholder for now.
                      The 'X' row in the image likely represents premiums/bonuses. 
                      Since we can't easily retrieve past pulka premiums from current state structure 
                      (unless we add it to history), we might skip this or just show it if it's the LAST pulka.
                  */}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
