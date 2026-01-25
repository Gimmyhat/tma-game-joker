import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ScoreSheetModal } from './ScoreSheetModal';

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
  if (!gameState?.lastPulkaResults || gameState.phase !== 'pulka_complete') return null;

  const { pulka } = gameState.lastPulkaResults;

  return (
    <ScoreSheetModal
      isOpen={true}
      isPulkaResult={true}
      title={
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">
            Pulka {pulka} Complete
          </span>
        </div>
      }
      footer={
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-gray-400 text-xs uppercase tracking-wider">Starting Next Round in</p>
          <div className="text-3xl font-mono font-bold text-yellow-400 tabular-nums">
            {timeLeft}
          </div>
        </div>
      }
    />
  );
};
