import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';

export const GameOverModal: React.FC = () => {
  const { t } = useTranslation();
  const { gameState, leaveGame } = useGameStore();

  if (gameState?.phase !== 'finished') return null;

  // Sort players by total score descending
  const sortedPlayers = [...gameState.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sortedPlayers[0];
  const isWinner = winner.id === useGameStore.getState().myPlayerId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col items-center text-center pb-8">
        {/* Header / Trophy */}
        <div className="w-full bg-gradient-to-b from-amber-500/10 to-transparent pt-10 pb-6 px-4 border-b border-white/5">
          <div className="text-6xl mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
            {isWinner ? '🏆' : '🏁'}
          </div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 uppercase tracking-widest mb-2">
            {isWinner ? t('game.victory') : t('game.gameOver')}
          </h2>
          <p className="text-amber-200/60 font-serif italic text-lg">
            {isWinner ? t('game.congrats') : t('game.winnerIs', { name: winner.name })}
          </p>
        </div>

        {/* Scoreboard */}
        <div className="w-full px-6 py-6 space-y-3">
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === useGameStore.getState().myPlayerId;
            const rank = index + 1;

            let rowStyle = 'bg-white/5 border-white/5 text-slate-300';
            if (index === 0)
              rowStyle =
                'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
            if (isMe) rowStyle += ' ring-1 ring-white/20';

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${rowStyle}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50' : 'bg-slate-700 text-slate-400'}
                  `}
                  >
                    {rank}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`font-bold ${index === 0 ? 'text-lg' : 'text-base'}`}>
                      {player.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] uppercase tracking-wider opacity-60">
                        {t('game.you')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-2xl font-mono font-bold tracking-tight">
                  {player.totalScore}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action */}
        <div className="px-6 w-full mt-4">
          <button
            onClick={leaveGame}
            className="w-full py-4 rounded-xl bg-white text-slate-900 font-black uppercase tracking-widest hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            {t('game.returnToLobby')}
          </button>
        </div>
      </div>
    </div>
  );
};
