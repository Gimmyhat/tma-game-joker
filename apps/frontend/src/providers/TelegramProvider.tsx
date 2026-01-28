/**
 * Telegram SDK Provider component
 * Initializes Telegram WebApp SDK and provides context
 */

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import {
  SDKProvider,
  useInitData,
  useInitDataRaw,
  useMiniApp,
  useViewport,
  useSwipeBehavior,
} from '@telegram-apps/sdk-react';
import { setInitData, setUserInfo } from '../lib/socket';
import { getMockUser, getMockInitData, isInTelegram, type TelegramUser } from '../lib/telegram';

interface TelegramContextType {
  user: TelegramUser | null;
  initDataRaw: string;
  isReady: boolean;
  isTelegram: boolean;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  initDataRaw: '',
  isReady: false,
  isTelegram: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

/**
 * Prevent accidental app closure via gestures
 */
function usePreventAccidentalClose() {
  useEffect(() => {
    // Prevent pinch-to-zoom
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Prevent scroll bounce / overscroll
    const preventOverscroll = (e: TouchEvent) => {
      // Only prevent if at boundaries
      const target = e.target as HTMLElement;
      const scrollable = target.closest('[data-scrollable]');

      if (!scrollable) {
        // If not in a scrollable container, prevent
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const startY = touch.clientY;

          // Prevent pull-to-refresh
          if (startY < 50 && window.scrollY === 0) {
            e.preventDefault();
          }
        }
      }
    };

    // Prevent context menu (long press)
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add listeners with passive: false for preventDefault to work
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    document.addEventListener('touchmove', preventOverscroll, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu);

    // Prevent wheel zoom (desktop but also trackpad)
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTapZoom);
      document.removeEventListener('touchmove', preventOverscroll);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('wheel', preventWheelZoom);
    };
  }, []);
}

/**
 * Inner component that uses SDK hooks (inside SDKProvider)
 */
function TelegramInner({ children }: { children: ReactNode }) {
  const initDataRawItem = useInitDataRaw();
  const initData = useInitData();
  const miniApp = useMiniApp();
  const viewport = useViewport();
  const swipeBehavior = useSwipeBehavior();
  const [isReady, setIsReady] = useState(false);

  // Apply gesture protection
  usePreventAccidentalClose();

  useEffect(() => {
    // Set initData for socket authentication
    const rawData = initDataRawItem?.result;
    if (typeof rawData === 'string') {
      setInitData(rawData);
    }

    // Expand viewport to fullscreen
    const vp = viewport;
    if (vp && !vp.isExpanded) {
      vp.expand();
    }

    // Disable vertical swipes to prevent accidental close
    const sb = swipeBehavior;
    if (sb && sb.disableVerticalSwipe) {
      try {
        sb.disableVerticalSwipe();
      } catch (e) {
        console.warn('[Telegram] Failed to disable vertical swipe:', e);
      }
    }

    // Signal ready
    const ma = miniApp;
    if (ma) {
      ma.ready();
      setIsReady(true);
    }
  }, [initDataRawItem, viewport, miniApp, swipeBehavior]);

  // Build user from initData
  const user: TelegramUser | null = initData?.user
    ? {
        id: initData.user.id,
        firstName: initData.user.firstName,
        lastName: initData.user.lastName,
        username: initData.user.username,
        languageCode: initData.user.languageCode,
        photoUrl: initData.user.photoUrl,
      }
    : null;

  useEffect(() => {
    if (user) {
      setUserInfo(user);
    }
  }, [user]);

  return (
    <TelegramContext.Provider
      value={{
        user,
        initDataRaw: typeof initDataRawItem?.result === 'string' ? initDataRawItem.result : '',
        isReady,
        isTelegram: true,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

/**
 * Fallback for development outside Telegram
 */
function DevFallback({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  // Apply gesture protection even in dev mode
  usePreventAccidentalClose();

  useEffect(() => {
    // Set mock initData for development
    setInitData(getMockInitData());
    setUserInfo(getMockUser());
    setIsReady(true);
    console.log('[Telegram] Running in development mode with mock user');
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        user: getMockUser(),
        initDataRaw: getMockInitData(),
        isReady,
        isTelegram: false,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

/**
 * Main Telegram Provider
 * Wraps app with SDK or provides mock data in development
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const isTelegram = isInTelegram();

  if (!isTelegram) {
    // Development mode - no Telegram SDK
    return <DevFallback>{children}</DevFallback>;
  }

  // Production mode - use SDK
  return (
    <SDKProvider acceptCustomStyles debug={import.meta.env.DEV}>
      <TelegramInner>{children}</TelegramInner>
    </SDKProvider>
  );
}
