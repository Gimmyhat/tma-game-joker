import React from 'react';
import { PlayerBadges as BadgesType } from '@joker/shared';

interface PlayerBadgesProps {
  badges: BadgesType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge configuration for Georgian Joker "Popular" variant
 */
const BADGE_CONFIG = {
  hasJokers: {
    emoji: '🎭',
    color: 'text-orange-400',
    tooltip: 'Джокер на руке',
    order: 1,
  },
  spoiled: {
    emoji: '❌',
    color: 'text-red-500',
    tooltip: 'Провал контракта',
    order: 2,
  },
  perfectPulka: {
    emoji: '⭐',
    color: 'text-yellow-400',
    tooltip: 'Все контракты выполнены',
    order: 3,
  },
  tookAll: {
    emoji: '💎',
    color: 'text-yellow-400',
    tooltip: 'Взял всё',
    order: 4,
  },
  perfectPass: {
    emoji: '⚡',
    color: 'text-yellow-400',
    tooltip: 'Идеальный пас',
    order: 5,
  },
} as const;

type BadgeKey = keyof typeof BADGE_CONFIG;

const SIZE_CLASSES = {
  sm: 'text-sm gap-0.5',
  md: 'text-base gap-1',
  lg: 'text-lg gap-1',
} as const;

/**
 * Displays player achievement badges
 *
 * Badges:
 * - 🎭 Joker in hand (only visible for own hand)
 * - ❌ Failed contract this pulka
 * - ⭐ All contracts completed in pulka (shown at pulka end)
 * - 💎 "Took all" at least once this pulka
 * - ⚡ Perfect pass at least once this pulka
 */
export const PlayerBadges: React.FC<PlayerBadgesProps> = ({
  badges,
  size = 'md',
  className = '',
}) => {
  // Get active badges sorted by display order
  const activeBadges = (Object.keys(BADGE_CONFIG) as BadgeKey[])
    .filter((key) => badges[key])
    .sort((a, b) => BADGE_CONFIG[a].order - BADGE_CONFIG[b].order);

  if (activeBadges.length === 0) return null;

  return (
    <div
      className={`flex items-center ${SIZE_CLASSES[size]} ${className}`}
      role="group"
      aria-label="Player badges"
    >
      {activeBadges.map((key) => {
        const config = BADGE_CONFIG[key];
        return (
          <span
            key={key}
            title={config.tooltip}
            className={`
              ${config.color}
              animate-in fade-in duration-300
              cursor-help
              drop-shadow-sm
              hover:scale-110 transition-transform
            `}
            role="img"
            aria-label={config.tooltip}
          >
            {config.emoji}
          </span>
        );
      })}
    </div>
  );
};

export default PlayerBadges;
