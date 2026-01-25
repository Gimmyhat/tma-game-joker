import React from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '@joker/shared';

interface PlayerInfoProps {
  player: Player;
  position: string;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  className?: string;
  onScoreClick?: () => void;
}

const UserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7 7 7zm-1-10h2v2h-2zm0 4h2v6h-2z" />
  </svg>
);

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  position,
  isCurrentTurn = false,
  isDealer = false,
  className = '',
  onScoreClick,
}) => {
  const { t } = useTranslation();
  // Determine layout orientation based on position
  const isRight = position.includes('right');

  return (
    <div
      className={`
        relative flex items-center group
        ${isRight ? 'flex-row-reverse text-right' : 'flex-row text-left'}
        ${className}
      `}
    >
      {/* Avatar Container */}
      <div className="relative z-10">
        {/* Glow Ring */}
        <div
          className={`
            absolute inset-0 rounded-full transition-all duration-500
            ${
              isCurrentTurn
                ? 'bg-yellow-400 blur-md opacity-40 scale-110'
                : 'bg-transparent opacity-0 scale-100'
            }
          `}
        />

        {/* Avatar Circle */}
        <div
          className={`
            w-14 h-14 rounded-full flex items-center justify-center border-2
            relative z-10 overflow-hidden bg-slate-800 transition-all duration-300
            ${
              isCurrentTurn
                ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                : 'border-slate-600 shadow-md'
            }
            ${player.spoiled ? 'grayscale opacity-60 border-red-900' : ''}
          `}
        >
          {/* Inner Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />

          {player.isBot ? (
            <BotIcon
              className={`w-8 h-8 ${isCurrentTurn ? 'text-yellow-100' : 'text-slate-400'}`}
            />
          ) : (
            <UserIcon
              className={`w-8 h-8 ${isCurrentTurn ? 'text-yellow-100' : 'text-slate-300'}`}
            />
          )}
        </div>

        {/* Connection Dot */}
        <div
          className={`
            absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 z-20
            ${player.connected ? 'bg-green-500' : 'bg-red-500'}
          `}
        />

        {/* Dealer Badge */}
        {isDealer && (
          <div
            className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-slate-900 z-20 flex items-center justify-center"
            title="Dealer"
          >
            <span className="text-[10px] font-black text-slate-900 leading-none">D</span>
          </div>
        )}
      </div>

      {/* Info Card - Slides out from avatar */}
      <div
        className={`
          flex flex-col justify-center
          py-2 px-4 rounded-xl
          backdrop-blur-sm border border-white/5
          transition-all duration-300
          ${isRight ? 'mr-3 pr-6' : 'ml-3 pl-6'}
          ${
            isCurrentTurn
              ? 'bg-slate-900/90 border-yellow-500/30 translate-x-0 opacity-100'
              : 'bg-slate-900/60 opacity-80'
          }
        `}
      >
        {/* Name */}
        <div className={`flex items-center gap-2 mb-1 ${isRight ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[100px] uppercase">
            {player.name}
          </span>
          {player.isBot && (
            <span className="text-[9px] px-1 py-0.5 bg-slate-700 rounded border border-slate-600 text-slate-300 leading-none">
              {t('game.player.bot')}
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div
          className={`flex items-center gap-3 text-[10px] uppercase tracking-wide ${isRight ? 'flex-row-reverse' : ''}`}
        >
          {/* Bet */}
          <div className="flex flex-col leading-none">
            <span className="text-slate-400 mb-0.5">{t('game.player.bet')}</span>
            <span
              className={`font-bold text-lg ${player.bet === null ? 'text-slate-500' : 'text-yellow-400'}`}
            >
              {player.bet ?? '-'}
            </span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Tricks */}
          <div className="flex flex-col leading-none">
            <span className="text-slate-400 mb-0.5">{t('game.player.tricks')}</span>
            <span className="font-bold text-lg text-white">{player.tricks}</span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Score */}
          <div className="flex flex-col leading-none relative group/score">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-slate-400">{t('game.player.score')}</span>
              {onScoreClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onScoreClick();
                  }}
                  className="w-3 h-3 rounded-full border border-slate-500 flex items-center justify-center text-[8px] text-slate-400 hover:text-white hover:border-white transition-colors"
                >
                  ?
                </button>
              )}
            </div>
            <span className="font-bold text-lg text-green-400">{player.totalScore}</span>
          </div>
        </div>
      </div>

      {/* Turn Arrow */}
      {isCurrentTurn && (
        <div
          className={`
                absolute -top-3 left-1/2 -translate-x-1/2 
                text-yellow-400 text-[10px] font-bold uppercase tracking-widest
                animate-bounce drop-shadow-md
            `}
        >
          {t('game.player.turn')}
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
