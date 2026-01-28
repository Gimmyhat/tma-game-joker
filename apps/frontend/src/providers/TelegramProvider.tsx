/**
 * Telegram SDK Provider component
 * Initializes Telegram WebApp SDK and provides context
 */

import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
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
  requestFullscreenMode: () => Promise<void>;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  initDataRaw: '',
  isReady: false,
  isTelegram: false,
  requestFullscreenMode: async () => {},
});

export function useTelegram() {
  return useContext(TelegramContext);
}

/**
 * Prevent accidental app closure via gestures - AGGRESSIVE version
 */
function usePreventAccidentalClose() {
  const touchStartY = useRef(0);

  useEffect(() => {
    // Prevent ALL multi-touch gestures (pinch-to-zoom)
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
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

    // Track touch start position
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY.current = e.touches[0].clientY;
      }
      // Prevent multi-touch
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent vertical swipes that could close TMA
    const preventVerticalSwipe = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        e.preventDefault();
        return;
      }

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartY.current;

      // If swiping down from top area - BLOCK (this closes TMA)
      if (touchStartY.current < 100 && deltaY > 10) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // If swiping up from bottom - BLOCK (this can also trigger gestures)
      const screenHeight = window.innerHeight;
      if (touchStartY.current > screenHeight - 100 && deltaY < -10) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Check if we're in a scrollable container
      const target = e.target as HTMLElement;
      const scrollable = target.closest('[data-scrollable]');

      if (!scrollable) {
        // Not in scrollable - prevent all vertical movement
        if (Math.abs(deltaY) > 5) {
          e.preventDefault();
        }
      }
    };

    // Prevent context menu (long press)
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Prevent wheel zoom
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // Add listeners with passive: false for preventDefault to work
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    document.addEventListener('touchmove', preventVerticalSwipe, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    // Also prevent on body and html
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTapZoom);
      document.removeEventListener('touchmove', preventVerticalSwipe);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('wheel', preventWheelZoom);
    };
  }, []);
}

/**
 * Request fullscreen via browser API (for RotateDeviceOverlay)
 */
async function requestBrowserFullscreen(): Promise<boolean> {
  const elem = document.documentElement;

  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      return true;
    }
    // @ts-expect-error - Vendor prefixed
    if (elem.webkitRequestFullscreen) {
      // @ts-expect-error
      await elem.webkitRequestFullscreen();
      return true;
    }
  } catch (e) {
    console.warn('[Fullscreen] Browser request failed:', e);
  }

  return false;
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
  const initRef = useRef(false);

  // Apply gesture protection
  usePreventAccidentalClose();

  // Initialize Telegram SDK - run ONCE
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // IMMEDIATELY disable vertical swipes - this is critical
    const sb = swipeBehavior;
    if (sb) {
      try {
        if (typeof sb.disableVerticalSwipe === 'function') {
          sb.disableVerticalSwipe();
          console.log('[Telegram] Vertical swipe disabled via disableVerticalSwipe()');
        }
      } catch (e) {
        console.warn('[Telegram] Failed to disable vertical swipe:', e);
      }
    }

    // Set initData for socket authentication
    const rawData = initDataRawItem?.result;
    if (typeof rawData === 'string') {
      setInitData(rawData);
    }

    // Expand viewport to fullscreen
    const vp = viewport;
    if (vp) {
      if (!vp.isExpanded && typeof vp.expand === 'function') {
        try {
          vp.expand();
          console.log('[Telegram] Viewport expanded');
        } catch (e) {
          console.warn('[Telegram] Failed to expand viewport:', e);
        }
      }

      // Try to request fullscreen if available
      // @ts-expect-error - requestFullscreen may exist in newer SDK versions
      if (typeof vp.requestFullscreen === 'function') {
        try {
          // @ts-expect-error
          vp.requestFullscreen();
          console.log('[Telegram] Fullscreen requested via SDK');
        } catch (e) {
          console.warn('[Telegram] Failed to request fullscreen via SDK:', e);
        }
      }
    }

    // Signal ready
    const ma = miniApp;
    if (ma && typeof ma.ready === 'function') {
      ma.ready();
      setIsReady(true);
      console.log('[Telegram] MiniApp ready');
    }
  }, [initDataRawItem, viewport, miniApp, swipeBehavior]);

  // Request fullscreen mode (can be called later, e.g., on user interaction)
  const requestFullscreenMode = useCallback(async () => {
    // Try SDK method first
    const vp = viewport;
    // @ts-expect-error - requestFullscreen may exist in newer SDK versions
    if (vp && typeof vp.requestFullscreen === 'function') {
      try {
        // @ts-expect-error
        await vp.requestFullscreen();
        console.log('[Telegram] Fullscreen via SDK');
        return;
      } catch (e) {
        console.warn('[Telegram] SDK fullscreen failed:', e);
      }
    }

    // Fallback to browser API
    await requestBrowserFullscreen();
  }, [viewport]);

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
        requestFullscreenMode,
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

  const requestFullscreenMode = useCallback(async () => {
    await requestBrowserFullscreen();
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        user: getMockUser(),
        initDataRaw: getMockInitData(),
        isReady,
        isTelegram: false,
        requestFullscreenMode,
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
