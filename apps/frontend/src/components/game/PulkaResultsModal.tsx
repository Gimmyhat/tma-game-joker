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

  // Only show if we have results AND phase is PulkaComplete
  // The results stay in state for history, but modal should only show during the phase
  if (!gameState?.lastPulkaResults || gameState.phase !== 'pulka_complete') return null;

  const { pulka, playerScores } = gameState.lastPulkaResults;
  const players = gameState.players;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#1a2c38] border border-[#2c3e50] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0f172a] p-4 text-center border-b border-[#2c3e50]">
          <h2 className="text-xl font-bold text-white">Итоги пульки {pulka}</h2>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a]/50 border-b border-[#2c3e50] text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Игрок</th>
                <th className="p-4 font-medium text-right">Премия</th>
                <th className="p-4 font-medium text-right">Общий счет</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c3e50]/50">
              {players.map((player) => {
                const score = playerScores[player.id] ?? 0;
                let scoreColor = 'text-yellow-400';
                if (score > 0) scoreColor = 'text-emerald-400';
                if (score < 0) scoreColor = 'text-red-400';

                return (
                  <tr key={player.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-gray-200 font-medium">{player.name}</td>
                    <td className={`p-4 text-right font-mono font-bold ${scoreColor}`}>
                      {score > 0 ? `+${score}` : score}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      {player.totalScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
