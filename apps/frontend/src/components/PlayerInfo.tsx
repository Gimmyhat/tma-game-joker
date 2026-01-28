import React, { useMemo } from 'react';
import { Player } from '@joker/shared';
// import { PlayerBadges } from './PlayerBadges'; // Unused

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
  // onScoreClick, // Unused
}) => {
  // const { t } = useTranslation(); // Unused
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

        {/* Main Avatar Container - Increased to 56px (w-14) / 64px (w-16) */}
        <div
          className={`
            relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden 
            border-[2px] shadow-lg transition-all duration-300 bg-slate-800
            ${
              isCurrentTurn
                ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105'
                : 'border-[#c9a227] shadow-card'
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
            absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 z-30 shadow-sm
            ${player.connected ? 'bg-green-500' : 'bg-red-500'}
          `}
        />

        {/* Dealer Badge - Compact */}
        {isDealer && (
          <div
            className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border border-yellow-700 z-30 flex items-center justify-center shadow-md"
            title="Dealer"
          >
            <span className="text-[9px] font-black text-yellow-900">D</span>
          </div>
        )}
      </div>

      {/* Info Badge (Pill) - Compact & Overlapping */}
      <div
        className={`
          absolute -bottom-3 left-1/2 -translate-x-1/2 z-20
          flex items-center gap-2 py-0.5 px-3 rounded-full
          bg-black/80 backdrop-blur-md border border-white/10 shadow-lg
          whitespace-nowrap transition-all duration-300
          ${isCurrentTurn ? 'border-yellow-500/50' : ''}
          ${player.spoiled ? 'opacity-60' : ''}
        `}
      >
        {/* Name */}
        <span className="text-[10px] font-bold text-white uppercase tracking-wider max-w-[60px] truncate">
          {player.name}
        </span>

        {/* Vertical Divider */}
        <div className="w-px h-3 bg-white/20" />

        {/* Score */}
        <span className="text-[10px] font-bold text-[#e6c34a] font-mono leading-none">
          {player.totalScore}
        </span>
      </div>

      {/* Bet Info (Floating Tag) */}
      {player.bet !== null && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-600 rounded-md px-1.5 py-0.5 z-20 shadow-sm flex items-center gap-1">
          <span className="text-[8px] text-slate-400 uppercase">Bet</span>
          <span className="text-[9px] font-bold text-white">{player.bet}</span>
        </div>
      )}

      {/* Tricks Counter (Floating Bubble) */}
      {player.tricks > 0 && (
        <div
          className={`
            absolute top-0 -right-2 
            min-w-[18px] h-[18px] px-1 rounded-full 
            bg-blue-600 border border-blue-400 
            flex items-center justify-center 
            shadow-lg z-30 animate-in zoom-in duration-200
           `}
        >
          <span className="text-[9px] font-bold text-white leading-none">{player.tricks}</span>
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
