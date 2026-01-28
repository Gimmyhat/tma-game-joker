/**
 * Hook to get responsive card size based on viewport
 * Optimized for Telegram Mini App (mobile landscape)
 */

import { useState, useEffect } from 'react';

type CardSize = 'xs' | 'sm' | 'md' | 'lg';

interface ViewportInfo {
  /** Card size for hand (player's cards) */
  handCardSize: CardSize;
  /** Card size for table (center area) */
  tableCardSize: CardSize;
  /** Card size for trump indicator */
  trumpCardSize: CardSize;
  /** Is mobile landscape mode */
  isMobileLandscape: boolean;
  /** Is mobile portrait mode */
  isMobilePortrait: boolean;
  /** Viewport width */
  width: number;
  /** Viewport height */
  height: number;
}

export function useResponsiveCards(): ViewportInfo {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>(() => getViewportInfo());

  useEffect(() => {
    const handleResize = () => {
      setViewportInfo(getViewportInfo());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial check
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return viewportInfo;
}

function getViewportInfo(): ViewportInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  const isMobile = width < 1024 || height < 600;
  const isMobileLandscape = isMobile && isLandscape;
  const isMobilePortrait = isMobile && !isLandscape;

  // Determine card sizes based on viewport
  let handCardSize: CardSize;
  let tableCardSize: CardSize;
  let trumpCardSize: CardSize;

  if (isMobileLandscape) {
    // Mobile landscape: compact cards
    if (height < 400) {
      // Very small height (e.g., notch phones)
      handCardSize = 'xs';
      tableCardSize = 'xs';
      trumpCardSize = 'xs';
    } else if (height < 500) {
      // Small height
      handCardSize = 'sm';
      tableCardSize = 'xs';
      trumpCardSize = 'xs';
    } else {
      // Normal mobile landscape
      handCardSize = 'sm';
      tableCardSize = 'sm';
      trumpCardSize = 'xs';
    }
  } else if (isMobilePortrait) {
    // Mobile portrait (shouldn't happen with RotateDeviceOverlay)
    handCardSize = 'sm';
    tableCardSize = 'sm';
    trumpCardSize = 'sm';
  } else {
    // Desktop / tablet
    if (width < 1280) {
      handCardSize = 'md';
      tableCardSize = 'sm';
      trumpCardSize = 'sm';
    } else {
      handCardSize = 'lg';
      tableCardSize = 'md';
      trumpCardSize = 'sm';
    }
  }

  return {
    handCardSize,
    tableCardSize,
    trumpCardSize,
    isMobileLandscape,
    isMobilePortrait,
    width,
    height,
  };
}

export default useResponsiveCards;
