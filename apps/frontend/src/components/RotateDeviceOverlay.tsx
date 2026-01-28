/**
 * Overlay that appears when device is in portrait mode
 * Attempts to lock orientation to landscape, shows instruction if not possible
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../providers/TelegramProvider';

interface RotateDeviceOverlayProps {
  /** Force show overlay (for testing) */
  forceShow?: boolean;
}

/**
 * Attempts to lock screen orientation to landscape
 * Returns true if successful, false if not supported
 */
async function tryLockLandscape(): Promise<boolean> {
  try {
    // Method 1: Screen Orientation API (modern browsers)
    if (screen.orientation && 'lock' in screen.orientation) {
      // @ts-expect-error - lock() exists but TypeScript types are incomplete
      await screen.orientation.lock('landscape');
      return true;
    }
  } catch (e) {
    console.warn('[Orientation] screen.orientation.lock failed:', e);
  }

  try {
    // Method 2: Legacy webkit API (older iOS/Android)
    // @ts-expect-error - Legacy API not in types
    if (screen.lockOrientation) {
      // @ts-expect-error
      return screen.lockOrientation('landscape');
    }
    // @ts-expect-error
    if (screen.mozLockOrientation) {
      // @ts-expect-error
      return screen.mozLockOrientation('landscape');
    }
    // @ts-expect-error
    if (screen.msLockOrientation) {
      // @ts-expect-error
      return screen.msLockOrientation('landscape');
    }
  } catch (e) {
    console.warn('[Orientation] Legacy lock failed:', e);
  }

  return false;
}

export function RotateDeviceOverlay({ forceShow }: RotateDeviceOverlayProps) {
  const { t } = useTranslation();
  const { requestFullscreenMode } = useTelegram();
  const [isPortrait, setIsPortrait] = useState(false);
  const [lockAttempted, setLockAttempted] = useState(false);

  const checkOrientation = useCallback(() => {
    // Check if on mobile device (touch support + small screen)
    const isMobile = window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches;

    // Only show for mobile devices in portrait
    if (!isMobile && !forceShow) {
      setIsPortrait(false);
      return;
    }

    // Check orientation via multiple methods for reliability
    const isPortraitMode =
      window.innerHeight > window.innerWidth ||
      (screen?.orientation?.type?.includes('portrait') ?? false);

    setIsPortrait(isPortraitMode || !!forceShow);
  }, [forceShow]);

  // Attempt to lock orientation on mount
  useEffect(() => {
    const attemptOrientationLock = async () => {
      if (lockAttempted) return;
      setLockAttempted(true);

      // First try without fullscreen
      let locked = await tryLockLandscape();

      if (!locked) {
        // Some browsers require fullscreen for orientation lock
        // Use Telegram SDK fullscreen first
        try {
          await requestFullscreenMode();
          locked = await tryLockLandscape();
        } catch (e) {
          console.warn('[Orientation] Fullscreen + lock failed:', e);
        }
      }

      if (locked) {
        console.log('[Orientation] Successfully locked to landscape');
      } else {
        console.log('[Orientation] Could not lock orientation, will show overlay');
      }
    };

    attemptOrientationLock();
  }, [lockAttempted, requestFullscreenMode]);

  // Listen for orientation changes
  useEffect(() => {
    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    if (screen?.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, [checkOrientation]);

  // Handle manual rotation request
  const handleRotateClick = useCallback(async () => {
    // Try fullscreen + orientation lock on user interaction
    try {
      await requestFullscreenMode();
      await tryLockLandscape();
    } catch (e) {
      console.warn('[Orientation] Manual fullscreen request failed:', e);
    }
  }, [requestFullscreenMode]);

  if (!isPortrait) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#1a472a] to-[#0d2616] text-white"
      onClick={handleRotateClick}
    >
      {/* Animated phone icon */}
      <div className="relative mb-8">
        <div className="w-24 h-40 border-4 border-white/80 rounded-3xl flex items-center justify-center animate-[rotatePhone_2s_ease-in-out_infinite]">
          {/* Screen */}
          <div className="w-16 h-28 bg-white/10 rounded-xl" />
          {/* Home button */}
          <div className="absolute bottom-2 w-6 h-6 rounded-full border-2 border-white/50" />
        </div>

        {/* Rotation arrow */}
        <svg
          className="absolute -right-10 top-1/2 -translate-y-1/2 w-8 h-8 text-amber-400 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>

      {/* Text */}
      <h2 className="text-2xl font-bold mb-2 text-center px-4">
        {t('game.rotateDevice', 'Поверните устройство')}
      </h2>
      <p className="text-white/70 text-center px-8 max-w-xs">
        {t('game.rotateDeviceHint', 'Для лучшего игрового опыта поверните телефон горизонтально')}
      </p>

      {/* Tap hint */}
      <p className="text-amber-400/80 text-sm mt-4 animate-pulse">
        {t('game.tapToFullscreen', 'Нажмите для полноэкранного режима')}
      </p>

      {/* Decorative cards */}
      <div className="absolute bottom-8 flex gap-2 opacity-30">
        <div className="w-12 h-16 bg-white rounded-lg shadow-lg transform -rotate-12" />
        <div className="w-12 h-16 bg-white rounded-lg shadow-lg transform rotate-6" />
        <div className="w-12 h-16 bg-white rounded-lg shadow-lg transform -rotate-3" />
      </div>

      {/* CSS for phone rotation animation */}
      <style>{`
        @keyframes rotatePhone {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-90deg); }
        }
      `}</style>
    </div>
  );
}

export default RotateDeviceOverlay;
