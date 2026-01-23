import React from 'react';
import { useTranslation } from 'react-i18next';

interface ScoringInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoringInfoModal: React.FC<ScoringInfoModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white">{t('game.scoring.title')}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
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
            </button>
          </div>
          <p className="text-slate-400 text-xs uppercase tracking-wider">
            {t('game.scoring.subtitle')}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Rule 1: Took Own */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-lg">
              =
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                {t('game.scoring.madeContract')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('game.scoring.madeContractDesc')}
              </p>
              <p className="text-sm font-mono text-green-400 mt-1">
                {t('game.scoring.madeContractPoints')}
              </p>
            </div>
          </div>

          {/* Rule 2: Took All */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-lg">
              ★
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                {t('game.scoring.tookEverything')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('game.scoring.tookEverythingDesc')}
              </p>
              <p className="text-sm font-mono text-amber-400 mt-1">
                {t('game.scoring.tookEverythingPoints')}
              </p>
            </div>
          </div>

          {/* Rule 3: Miss */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-lg">
              ≠
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                {t('game.scoring.overUnderBet')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('game.scoring.overUnderBetDesc')}
              </p>
              <p className="text-sm font-mono text-red-400 mt-1">
                {t('game.scoring.overUnderBetPoints')}
              </p>
            </div>
          </div>

          {/* Rule 4: Shtanga */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 font-bold text-lg">
              0
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{t('game.scoring.shtanga')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('game.scoring.shtangaDesc')}
              </p>
              <p className="text-sm font-mono text-slate-300 mt-1">
                {t('game.scoring.shtangaPoints')}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 text-center">
          <p className="text-[10px] text-slate-500">{t('game.scoring.footer')}</p>
        </div>
      </div>
    </div>
  );
};
