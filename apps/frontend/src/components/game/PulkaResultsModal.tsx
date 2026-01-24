import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export const PulkaResultsModal: React.FC = () => {
  const { gameState, pulkaRecapExpiresAt } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!pulkaRecapExpiresAt) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.ceil((pulkaRecapExpiresAt - Date.now()) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pulkaRecapExpiresAt]);

  // Only show if we have results
  if (!gameState?.lastPulkaResults) return null;

  const { pulka, premiums, playerScores } = gameState.lastPulkaResults;
  const players = gameState.players;

  const getPlayerName = (id: string) => players.find((p) => p.id === id)?.name || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1a2c38] border border-[#2c3e50] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0f172a] p-4 text-center border-b border-[#2c3e50]">
          <h2 className="text-xl font-bold text-white">Итоги пульки {pulka}</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Scores */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Счет за пульку
            </h3>
            <div className="bg-[#0f172a]/50 rounded-lg p-3 space-y-2 border border-[#2c3e50]/50">
              {players.map((player) => (
                <div key={player.id} className="flex justify-between items-center">
                  <span className="text-gray-200 font-medium">{player.name}</span>
                  <span className="font-mono font-bold text-yellow-400 text-lg">
                    {playerScores[player.id] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Premiums */}
          {premiums && premiums.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Премии и Штрафы
              </h3>
              <div className="space-y-2">
                {premiums.map((prem, idx) => {
                  const playerName = getPlayerName(prem.playerId);
                  // We render two potential blocks per premium entry: one for gain, one for loss
                  return (
                    <React.Fragment key={idx}>
                      {prem.received > 0 && (
                        <div className="flex items-center justify-between text-emerald-400 bg-emerald-900/20 border border-emerald-900/30 p-2.5 rounded-lg">
                          <span className="font-medium">{playerName}</span>
                          <span className="text-sm font-bold">+{prem.received} (Премия)</span>
                        </div>
                      )}
                      {prem.takenAmount > 0 && (
                        <div className="flex items-center justify-between text-red-400 bg-red-900/20 border border-red-900/30 p-2.5 rounded-lg">
                          <span className="font-medium">{playerName}</span>
                          <div className="text-right">
                            <div className="text-sm font-bold">-{prem.takenAmount}</div>
                            <div className="text-[10px] opacity-80">
                              Отдано{' '}
                              {prem.takenFromPlayerId ? getPlayerName(prem.takenFromPlayerId) : '?'}
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Timer */}
        <div className="p-4 bg-[#0f172a] border-t border-[#2c3e50] text-center">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
            Следующий раунд через
          </p>
          <div className="text-3xl font-mono font-bold text-yellow-400 tabular-nums">
            {timeLeft}
          </div>
        </div>
      </div>
    </div>
  );
};
