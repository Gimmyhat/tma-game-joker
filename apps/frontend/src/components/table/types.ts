import { Card as CardType } from '@joker/shared';

export type Position =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'left-center'
  | 'right-center';

export interface TuzovanieSequenceItem {
  card: CardType;
  playerId: string;
  dealIndex: number;
}

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

/** Position coordinate configuration */
export interface PositionCoords {
  x: number;
  y: number;
  rotate?: number;
}

/** Start positions for card animations (off-screen / player hand area) */
export const START_POSITIONS: Record<Position, PositionCoords & { rotate: number }> = {
  'bottom-center': { x: 0, y: 400, rotate: 0 },
  'bottom-left': { x: -150, y: 400, rotate: 0 },
  'bottom-right': { x: 150, y: 400, rotate: -15 },
  'top-left': { x: -300, y: -400, rotate: 165 },
  'top-center': { x: 0, y: -400, rotate: 180 },
  'top-right': { x: 300, y: -400, rotate: 195 },
  'left-center': { x: -500, y: 0, rotate: 90 },
  'right-center': { x: 500, y: 0, rotate: -90 },
};

/** Base rotation for cards on table (facing center) */
export const BASE_ROTATION: Record<Position, number> = {
  'bottom-center': 0,
  'bottom-left': 15,
  'bottom-right': -15,
  'top-left': 165,
  'top-center': 180,
  'top-right': 195,
  'left-center': 90,
  'right-center': -90,
};

/** Target positions for cards in center of table */
export const TARGET_POSITIONS: Record<Position, PositionCoords> = {
  'bottom-center': { x: 0, y: 20 },
  'bottom-left': { x: -20, y: 20 },
  'bottom-right': { x: 20, y: 20 },
  'top-left': { x: -20, y: -20 },
  'top-center': { x: 0, y: -40 },
  'top-right': { x: 20, y: -20 },
  'left-center': { x: -30, y: 0 },
  'right-center': { x: 30, y: 0 },
};

/** Target positions for Tuzovanie cards (near players) */
export const TUZOVANIE_POSITIONS: Record<Position, PositionCoords & { rotate: number }> = {
  'bottom-center': { x: 0, y: 80, rotate: 0 },
  'bottom-left': { x: -60, y: 60, rotate: 20 },
  'bottom-right': { x: 60, y: 60, rotate: -20 },
  'top-left': { x: -60, y: -80, rotate: 160 },
  'top-center': { x: 0, y: -80, rotate: 180 },
  'top-right': { x: 60, y: -80, rotate: 200 },
  'left-center': { x: -70, y: 0, rotate: 90 },
  'right-center': { x: 70, y: 0, rotate: -90 },
};

/** Generate stable hash from string for pseudo-random values */
export function hashString(str: string): number {
  return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}
