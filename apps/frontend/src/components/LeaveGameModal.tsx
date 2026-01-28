import React from 'react';
import { useTranslation } from 'react-i18next';

interface LeaveGameModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const LeaveGameModal: React.FC<LeaveGameModalProps> = ({ isOpen, onConfirm, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content - Scaled down */}
      <div className="relative w-[85%] max-w-[280px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-white mb-2">{t('lobby.leaveGame')}</h2>

          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            {t('lobby.leaveGameConfirm')}
          </p>

          <div className="flex gap-2 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors border border-slate-700"
            >
              {t('lobby.leaveGameStay')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors shadow-lg shadow-red-900/20"
            >
              {t('lobby.leaveGame')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
