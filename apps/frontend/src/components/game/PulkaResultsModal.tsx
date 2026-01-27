import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { HandwrittenScoreSheet } from './HandwrittenScoreSheet';

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
    <HandwrittenScoreSheet
      isOpen={true}
      isPulkaResult={true}
      title={
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <span className="text-xl font-bold text-blue-900">Pulka {pulka} Complete</span>
        </div>
      }
      footer={
        <div className="flex flex-col items-center justify-center gap-2 text-blue-900">
          <p className="text-xs uppercase tracking-wider opacity-70">Starting Next Round in</p>
          <div className="text-3xl font-mono font-bold tabular-nums">{timeLeft}</div>
        </div>
      }
    />
  );
};
