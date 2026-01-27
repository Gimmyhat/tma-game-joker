import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export const VictoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { showVictoryScreen, setShowVictoryScreen, finalResults, finalPlace, setShowScoreSheet } =
    useGameStore();

  if (!showVictoryScreen || !finalResults) return null;

  const isWinner = finalPlace === 1;

  // Prepare ordered list for podium display (2nd, 1st, 3rd, 4th)
  const getOrderedRankings = () => {
    const r = finalResults.rankings;
    const first = r.find((p) => p.place === 1);
    const second = r.find((p) => p.place === 2);
    const third = r.find((p) => p.place === 3);
    const fourth = r.find((p) => p.place === 4);

    // Layout order: 2nd, 1st, 3rd, 4th
    return [second, first, third, fourth].filter(Boolean) as typeof r;
  };

  const podiumPlayers = getOrderedRankings();

  // Heights for bars
  const getHeight = (place: number) => {
    switch (place) {
      case 1:
        return 'h-48 sm:h-64';
      case 2:
        return 'h-32 sm:h-44';
      case 3:
        return 'h-24 sm:h-32';
      case 4:
        return 'h-16 sm:h-20';
      default:
        return 'h-12';
    }
  };

  const getColor = (place: number) => {
    switch (place) {
      case 1:
        return 'bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]'; // Gold
      case 2:
        return 'bg-gradient-to-t from-slate-600 to-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.2)]'; // Silver
      case 3:
        return 'bg-gradient-to-t from-orange-900 to-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.2)]'; // Bronze
      case 4:
        return 'bg-gradient-to-t from-slate-800 to-slate-600'; // Stone
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#051c14] overflow-hidden"
      >
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2f23] to-[#020c09] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-transparent to-transparent" />

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center h-full max-h-screen py-8">
          {/* Header */}
          <div className="relative w-full text-center mt-8 mb-4 sm:mb-12">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowVictoryScreen(false)}
              className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
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
              <span className="hidden sm:inline text-lg">{t('common.close', 'Закрыть')}</span>
            </motion.button>

            <motion.h1
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-5xl sm:text-7xl font-black text-white uppercase tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
            >
              {isWinner ? t('game.victory', 'ПОБЕДА!') : t('game.finished', 'ИГРА ОКОНЧЕНА')}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-emerald-200/70 text-lg sm:text-xl font-medium mt-2 max-w-md mx-auto leading-relaxed"
            >
              {isWinner
                ? t('game.victoryDesc', 'Вы заняли первое место в игре')
                : t('game.resultDesc', 'Вы заняли {{place}} место', { place: finalPlace })}
            </motion.p>
          </div>

          {/* Podium */}
          <div className="flex-1 w-full flex items-end justify-center gap-2 sm:gap-4 pb-20 sm:pb-32 px-2">
            {podiumPlayers.map((player, index) => {
              const isMe = player.playerId === useGameStore.getState().myPlayerId;

              return (
                <div
                  key={player.playerId}
                  className="flex flex-col items-center flex-1 max-w-[140px]"
                >
                  {/* Avatar / Name */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + index * 0.1 }} // Staggered names
                    className="mb-2 sm:mb-4 text-center"
                  >
                    <div className="text-white font-bold text-sm sm:text-lg truncate w-full max-w-[100px] sm:max-w-full">
                      {player.playerName}
                    </div>
                    {isMe && (
                      <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                        {t('game.you', 'ВЫ')}
                      </div>
                    )}
                  </motion.div>

                  {/* Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }} // Allows classes to control height
                    className="w-full relative flex flex-col justify-end"
                  >
                    <motion.div
                      className={`w-full ${getHeight(player.place)} ${getColor(
                        player.place,
                      )} rounded-t-lg sm:rounded-t-xl relative group transition-all duration-300 hover:brightness-110`}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        delay: 0.5 + index * 0.1, // Staggered bars
                        duration: 0.8,
                        type: 'spring',
                        bounce: 0.3,
                      }}
                      style={{ originY: 1 }}
                    >
                      {/* Place Number inside Bar */}
                      {player.place <= 3 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/20 font-black text-4xl sm:text-6xl select-none">
                          {player.place}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="w-full absolute bottom-0 left-0 bg-gradient-to-t from-black/90 to-transparent p-6 pb-8 flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2 text-white/40 mb-2">
              <svg
                className="w-5 h-5 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <button
              onClick={() => setShowScoreSheet(true)}
              className="w-full max-w-md py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold text-lg uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t('game.viewScoreSheet', 'Посмотреть лист счета')}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
