import React from 'react';

interface ScoringInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScoringInfoModal: React.FC<ScoringInfoModalProps> = ({ isOpen, onClose }) => {
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
            <h2 className="text-xl font-bold text-white">Scoring Rules</h2>
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
            How points are calculated
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Rule 1: Took Own */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-lg">
              =
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Made Contract</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you take exactly the number of tricks you bet:
              </p>
              <p className="text-sm font-mono text-green-400 mt-1">Bet × 50 points</p>
            </div>
          </div>

          {/* Rule 2: Took All */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-lg">
              ★
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Took Everything</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you bet and win ALL tricks in the round:
              </p>
              <p className="text-sm font-mono text-amber-400 mt-1">Bet × 100 points</p>
            </div>
          </div>

          {/* Rule 3: Miss */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-lg">
              ≠
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Over/Under Bet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Penalty for difference between bet and tricks:
              </p>
              <p className="text-sm font-mono text-red-400 mt-1">Difference × 10 points</p>
            </div>
          </div>

          {/* Rule 4: Shtanga */}
          <div className="flex gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 font-bold text-lg">
              0
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Shtanga (Penalty)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you take 0 tricks as Dealer or during special rounds:
              </p>
              <p className="text-sm font-mono text-slate-300 mt-1">-200 points</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 text-center">
          <p className="text-[10px] text-slate-500">Highest score after 24 rounds wins the game.</p>
        </div>
      </div>
    </div>
  );
};
