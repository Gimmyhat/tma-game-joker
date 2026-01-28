import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '@joker/shared';
import { PlayerBadges } from './PlayerBadges';

interface PlayerInfoProps {
  player: Player;
  position: string;
  isCurrentTurn?: boolean;
  isDealer?: boolean;
  className?: string;
  onScoreClick?: () => void;
}

const BotOverlayIcon = () => (
  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center z-20 shadow-sm">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-slate-300">
      <path d="M12 2c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7 7 7zm-1-10h2v2h-2zm0 4h2v6h-2z" />
    </svg>
  </div>
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
  const isRight = position.includes('right');
  const isTop = position.includes('top');
  const isBottom = position.includes('bottom');

  // Deterministic avatar URL using DiceBear
  const avatarUrl = useMemo(() => {
    const seed = player.id || player.name;
    // Using 'personas' for professional look
    return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=transparent`;
  }, [player.id, player.name]);

  return (
    <div
      className={`
        relative flex items-center gap-3
        ${isRight ? 'flex-row-reverse text-right' : 'flex-row text-left'}
        ${isTop ? 'flex-col-reverse gap-2' : ''}
        ${isBottom ? 'flex-col gap-2' : ''}
        ${className}
      `}
    >
      {/* Avatar Circle */}
      <div className="relative z-10 group cursor-pointer">
        {/* Active Turn Glow & Pulse */}
        <div
          className={`
            absolute inset-0 rounded-full transition-all duration-500
            ${isCurrentTurn ? 'opacity-100 animate-pulse-glow bg-yellow-400/30 blur-md scale-110' : 'opacity-0 scale-100'}
          `}
        />

        {/* Main Avatar Container */}
        <div
          className={`
            relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden 
            border-[3px] shadow-lg transition-all duration-300 bg-slate-800
            ${
              isCurrentTurn
                ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] scale-105'
                : 'border-[#c9a227] shadow-card' // Gold border by default
            }
            ${player.spoiled ? 'grayscale opacity-70' : ''}
          `}
        >
          {/* Avatar Image */}
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover transform scale-110 mt-1"
            loading="lazy"
          />

          {/* Inner Shadow for depth */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] pointer-events-none" />
        </div>

        {/* Bot Icon Overlay */}
        {player.isBot && <BotOverlayIcon />}

        {/* Connection Dot */}
        <div
          className={`
            absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 z-30 shadow-sm
            ${player.connected ? 'bg-green-500' : 'bg-red-500'}
          `}
        />

        {/* Dealer Badge - Gold Coin Style */}
        {isDealer && (
          <div
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border border-yellow-700 z-30 flex items-center justify-center shadow-md"
            title="Dealer"
          >
            <span className="text-[10px] font-black text-yellow-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
              D
            </span>
          </div>
        )}
      </div>

      {/* Info Badge (Pill) */}
      <div
        className={`
          relative flex items-center gap-3 py-1.5 px-4 rounded-full
          bg-black/60 backdrop-blur-md border border-white/10 shadow-lg
          transition-all duration-300
          ${isCurrentTurn ? 'border-yellow-500/50 bg-black/80' : ''}
          ${isRight ? 'flex-row-reverse pr-4 pl-4' : ''}
          ${player.spoiled ? 'opacity-60' : ''}
        `}
      >
        {/* Name & Badges */}
        <div className={`flex flex-col ${isRight ? 'items-end' : 'items-start'} leading-none`}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] md:text-xs font-bold text-white uppercase tracking-wider max-w-[80px] truncate shadow-black drop-shadow-md">
              {player.name}
            </span>
            {player.badges && <PlayerBadges badges={player.badges} size="sm" />}
          </div>

          {/* Bet Info (small below name) */}
          {player.bet !== null && (
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
              {t('game.player.bet', 'BET')}:{' '}
              <span className="text-yellow-400 font-bold">{player.bet}</span>
            </span>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-white/10" />

        {/* Total Score */}
        <div
          className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
          onClick={(e) => {
            if (onScoreClick) {
              e.stopPropagation();
              onScoreClick();
            }
          }}
        >
          <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-px">
            {t('game.player.score', 'SCORE')}
          </span>
          <span className="text-sm md:text-base font-bold text-[#e6c34a] leading-none drop-shadow-sm font-mono">
            {player.totalScore}
          </span>
        </div>

        {/* Tricks Counter (Floating Bubble if tricks > 0) */}
        {player.tricks > 0 && (
          <div
            className={`
              absolute -top-2 ${isRight ? '-left-2' : '-right-2'} 
              min-w-[20px] h-5 px-1.5 rounded-full 
              bg-blue-600 border border-blue-400 
              flex items-center justify-center 
              shadow-lg z-20 animate-in zoom-in duration-200
           `}
          >
            <span className="text-[10px] font-bold text-white">{player.tricks}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInfo;
