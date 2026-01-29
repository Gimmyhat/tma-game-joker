import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export const VictoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { showVictoryScreen, setShowVictoryScreen, finalResults, finalPlace, setShowScoreSheet } =
    useGameStore();
  const myPlayerId = useGameStore((state) => state.myPlayerId);

  // Mock data for dev/preview if needed, or rely on store
  if (!showVictoryScreen || !finalResults) return null;

  const isWinner = finalPlace === 1;

  // Prepare ordered list for podium display (2nd, 1st, 3rd)
  // We filter out 4th place for the podium, they go to the list only
  const podiumPlayers = useMemo(() => {
    const r = finalResults.rankings;
    const first = r.find((p) => p.place === 1);
    const second = r.find((p) => p.place === 2);
    const third = r.find((p) => p.place === 3);

    // Layout order: 2nd (Left), 1st (Center), 3rd (Right)
    return [second, first, third].filter(Boolean) as typeof r;
  }, [finalResults]);

  // All players sorted for the list
  const allPlayersSorted = useMemo(() => {
    return [...finalResults.rankings].sort((a, b) => a.place - b.place);
  }, [finalResults]);

  // Heights for bars
  const getHeight = (place: number) => {
    switch (place) {
      case 1:
        return 'h-40 sm:h-52';
      case 2:
        return 'h-28 sm:h-36';
      case 3:
        return 'h-20 sm:h-24';
      default:
        return 'h-0';
    }
  };

  const getGradient = (place: number) => {
    switch (place) {
      case 1: // Gold
        return 'bg-gradient-to-b from-[#ffd700] via-[#fdb931] to-[#e1ad01] shadow-[0_0_25px_rgba(253,185,49,0.4)] border-t border-[#ffffac]';
      case 2: // Silver
        return 'bg-gradient-to-b from-[#e0e0e0] via-[#c0c0c0] to-[#a0a0a0] shadow-[0_0_20px_rgba(192,192,192,0.3)] border-t border-[#ffffff]';
      case 3: // Bronze
        return 'bg-gradient-to-b from-[#cd7f32] via-[#b87333] to-[#a0522d] shadow-[0_0_20px_rgba(205,127,50,0.3)] border-t border-[#ffcc99]';
      default:
        return 'bg-slate-700';
    }
  };

  const getRomanPlace = (place: number) => {
    switch (place) {
      case 1:
        return 'I';
      case 2:
        return 'II';
      case 3:
        return 'III';
      default:
        return place;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-[#051c14] overflow-hidden font-sans"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f3d2e] to-[#020c09]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />

        {/* Confetti / particles could go here */}

        {/* Header Section */}
        <div className="relative z-10 w-full pt-12 pb-4 px-4 text-center">
          {/* Close Button */}
          <button
            onClick={() => setShowVictoryScreen(false)}
            className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm border border-white/5 transition-all text-emerald-100/70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">{t('common.close', 'Close')}</span>
          </button>

          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl sm:text-5xl font-black text-white uppercase tracking-widest drop-shadow-lg mb-2"
          >
            {isWinner ? t('game.victory', 'VICTORY!') : t('game.finished', 'GAME OVER')}
          </motion.h1>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-emerald-200/60 text-sm sm:text-base font-medium max-w-xs mx-auto"
          >
            {isWinner
              ? t('game.victoryDesc', 'You took first place in the match')
              : t('game.resultDesc', 'You finished in {{place}} place', { place: finalPlace })}
          </motion.p>
        </div>

        {/* Podium Section */}
        <div className="relative z-10 flex-shrink-0 w-full flex items-end justify-center gap-2 sm:gap-4 px-4 pb-8 pt-4">
          {podiumPlayers.map((player, index) => {
            const isMe = player.playerId === myPlayerId;
            const delay = 0.4 + index * 0.2;

            return (
              <div
                key={player.playerId}
                className="flex flex-col items-center justify-end w-1/3 max-w-[120px]"
              >
                {/* Player Name & Score */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.3 }}
                  className="mb-3 text-center"
                >
                  <div
                    className={`font-bold text-sm sm:text-base truncate max-w-full px-1 ${isMe ? 'text-amber-400' : 'text-white'}`}
                  >
                    {player.playerName}
                  </div>
                  <div
                    className={`text-xs font-mono font-bold ${player.totalScore >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {player.totalScore > 0 ? '+' : ''}
                    {player.totalScore}
                  </div>
                </motion.div>

                {/* The Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  className="w-full relative"
                >
                  <motion.div
                    className={`w-full ${getHeight(player.place)} ${getGradient(player.place)} rounded-t-lg relative flex items-center justify-center`}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: delay, duration: 0.6, type: 'spring' }}
                    style={{ originY: 1 }}
                  >
                    {/* Crown for 1st place */}
                    {player.place === 1 && (
                      <div className="absolute -top-6 text-3xl drop-shadow-md animate-bounce">
                        👑
                      </div>
                    )}

                    {/* Roman Numeral */}
                    <span className="font-serif italic font-bold text-3xl sm:text-4xl text-black/20 mix-blend-overlay">
                      {getRomanPlace(player.place)}
                    </span>
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Leaderboard List (Scrollable) */}
        <div className="flex-1 w-full relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 text-[10px] uppercase tracking-wider text-white/30 font-bold">
            <span className="w-8 text-center">#</span>
            <span className="flex-1 text-left px-2">Player</span>
            <span className="w-16 text-right">Points</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {allPlayersSorted.map((player) => {
              const isMe = player.playerId === myPlayerId;
              return (
                <motion.div
                  key={player.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    isMe ? 'bg-white/10 border-amber-500/30' : 'bg-white/5 border-transparent'
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        player.place === 1
                          ? 'bg-amber-500 text-black'
                          : player.place === 2
                            ? 'bg-slate-300 text-black'
                            : player.place === 3
                              ? 'bg-orange-700 text-white'
                              : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {player.place}
                    </span>
                  </div>

                  <div className="flex-1 px-3 flex flex-col">
                    <span className={`text-sm font-bold ${isMe ? 'text-amber-400' : 'text-white'}`}>
                      {player.playerName}
                    </span>
                    {isMe && <span className="text-[9px] text-white/30 uppercase">You</span>}
                  </div>

                  <div
                    className={`w-16 text-right font-mono font-bold text-sm ${player.totalScore >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {player.totalScore}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="p-4 bg-black/60 border-t border-white/5 flex justify-center pb-8">
            <button
              onClick={() => setShowScoreSheet(true)}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xs uppercase tracking-widest font-bold py-2"
            >
              <span>View Score Sheet</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
