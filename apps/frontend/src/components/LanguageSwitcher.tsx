import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`
        relative overflow-hidden group
        px-3 py-1.5 rounded-lg
        bg-black/20 hover:bg-black/40
        border border-white/10 hover:border-white/20
        backdrop-blur-sm transition-all duration-300
        flex items-center gap-2
        ${className}
      `}
      title={i18n.language === 'ru' ? 'Switch to English' : 'Переключить на Русский'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <span
          className={`absolute transition-all duration-300 font-bold text-xs ${
            i18n.language === 'ru'
              ? 'opacity-100 rotate-0 scale-100 text-white'
              : 'opacity-0 -rotate-90 scale-50 text-slate-400'
          }`}
        >
          RU
        </span>
        <span
          className={`absolute transition-all duration-300 font-bold text-xs ${
            i18n.language === 'en'
              ? 'opacity-100 rotate-0 scale-100 text-white'
              : 'opacity-0 rotate-90 scale-50 text-slate-400'
          }`}
        >
          EN
        </span>
      </div>

      {/* Decorative indicator */}
      <div className="w-1 h-1 rounded-full bg-yellow-500/50 group-hover:bg-yellow-400 transition-colors" />
    </button>
  );
};
