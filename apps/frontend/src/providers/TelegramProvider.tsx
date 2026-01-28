/**
 * Telegram SDK Provider component (SDK v3.x)
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
  init,
  miniApp,
  viewport,
  swipeBehavior,
  retrieveRawInitData,
  retrieveLaunchParams,
  type User,
} from '@telegram-apps/sdk';
import { setInitData, setUserInfo } from '../lib/socket';
import { getMockUser, getMockInitData, isInTelegram, type TelegramUser } from '../lib/telegram';

interface TelegramContextType {
  user: TelegramUser | null;
  initDataRaw: string;
  isReady: boolean;
  isTelegram: boolean;
  isFullscreen: boolean;
  requestFullscreenMode: () => Promise<void>;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  initDataRaw: '',
  isReady: false,
  isTelegram: false,
  isFullscreen: false,
  requestFullscreenMode: async () => {},
});

export function useTelegram() {
  return useContext(TelegramContext);
}

/**
 * Prevent accidental app closure via gestures
 */
function usePreventAccidentalClose(options?: { allowVerticalSwipe?: boolean }) {
  const allowVerticalSwipe = options?.allowVerticalSwipe ?? false;
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
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent vertical swipes that could close TMA (allow edge swipes to exit)
    const preventVerticalSwipe = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        e.preventDefault();
        return;
      }

      const target = e.target as HTMLElement;

      // NEVER block interactive elements
      const isInteractive = target.closest(
        'button, a, input, select, textarea, [role="button"], [data-interactive]',
      );
      if (isInteractive) return;

      // NEVER block elements inside modals
      const isInModal = target.closest('[class*="z-50"], [class*="z-["]');
      if (isInModal) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartY.current;

      const screenHeight = window.innerHeight;
      const edgeThreshold = 48;
      const isEdgeSwipeStart =
        touchStartY.current < edgeThreshold || touchStartY.current > screenHeight - edgeThreshold;
      if (isEdgeSwipeStart) return;

      // Block significant vertical drags outside scrollable areas
      const scrollable = target.closest('[data-scrollable]');
      if (!scrollable && Math.abs(deltaY) > 30) {
        e.preventDefault();
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

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
    if (!allowVerticalSwipe) {
      document.addEventListener('touchmove', preventVerticalSwipe, { passive: false });
    }
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchend', preventDoubleTapZoom);
      if (!allowVerticalSwipe) {
        document.removeEventListener('touchmove', preventVerticalSwipe);
      }
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('wheel', preventWheelZoom);
    };
  }, [allowVerticalSwipe]);
}

/**
 * Request fullscreen via browser API (fallback)
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
 * Convert SDK User to TelegramUser
 */
function sdkUserToTelegramUser(sdkUser: User): TelegramUser {
  return {
    id: sdkUser.id,
    firstName: sdkUser.first_name,
    lastName: sdkUser.last_name,
    username: sdkUser.username,
    languageCode: sdkUser.language_code,
    photoUrl: sdkUser.photo_url,
  };
}

/**
 * Inner component that uses SDK v3.x
 */
function TelegramInner({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [rawInitData, setRawInitDataState] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const initRef = useRef(false);

  // Apply gesture protection
  usePreventAccidentalClose({ allowVerticalSwipe: true });

  // Initialize SDK components - run ONCE
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initializeSDK = async () => {
      try {
        // Get raw init data first
        try {
          const rawData = retrieveRawInitData();
          if (rawData) {
            setRawInitDataState(rawData);
            setInitData(rawData);
          }
        } catch (e) {
          console.warn('[Telegram] Failed to retrieve raw init data:', e);
        }

        // Get user from launch params
        try {
          const launchParams = retrieveLaunchParams();
          if (launchParams.tgWebAppData?.user) {
            const userData = sdkUserToTelegramUser(launchParams.tgWebAppData.user);
            setUser(userData);
            setUserInfo(userData);
          }
        } catch (e) {
          console.warn('[Telegram] Failed to retrieve launch params:', e);
        }

        // Mount swipe behavior
        if (swipeBehavior.mount.isAvailable()) {
          swipeBehavior.mount();
          console.log('[Telegram] SwipeBehavior mounted');

          if (swipeBehavior.enableVertical.isAvailable()) {
            swipeBehavior.enableVertical();
            console.log('[Telegram] Vertical swipes enabled');
          }
        }

        // Disable vertical swipes immediately
        // Mount viewport
        if (viewport.mount.isAvailable()) {
          await viewport.mount();
          console.log('[Telegram] Viewport mounted');

          // Bind CSS variables for safe area insets
          if (viewport.bindCssVars.isAvailable()) {
            viewport.bindCssVars();
            console.log('[Telegram] Viewport CSS vars bound');
          }
        }

        // Expand viewport
        if (viewport.expand.isAvailable()) {
          viewport.expand();
          console.log('[Telegram] Viewport expanded');
        }

        // Request fullscreen mode (removes Telegram header)
        if (viewport.requestFullscreen.isAvailable()) {
          try {
            await viewport.requestFullscreen();
            setIsFullscreen(true);
            console.log('[Telegram] Fullscreen requested');
          } catch (e) {
            console.warn('[Telegram] Fullscreen request failed:', e);
          }
        }

        // Subscribe to fullscreen changes
        if (viewport.isMounted()) {
          viewport.isFullscreen.sub((value) => {
            setIsFullscreen(value);
          });
        }

        // Mount mini app
        if (miniApp.mount.isAvailable()) {
          miniApp.mount();
          console.log('[Telegram] MiniApp mounted');
        }

        // Signal app is ready
        if (miniApp.ready.isAvailable()) {
          miniApp.ready();
          console.log('[Telegram] MiniApp ready');
        }

        setIsReady(true);
      } catch (e) {
        console.error('[Telegram] SDK initialization failed:', e);
        setIsReady(true); // Still mark as ready to show UI
      }
    };

    initializeSDK();
  }, []);

  // Request fullscreen mode (can be called on user interaction)
  const requestFullscreenMode = useCallback(async () => {
    // Try SDK method first
    if (viewport.requestFullscreen.isAvailable()) {
      try {
        await viewport.requestFullscreen();
        console.log('[Telegram] Fullscreen via SDK');
        return;
      } catch (e) {
        console.warn('[Telegram] SDK fullscreen failed:', e);
      }
    }
    // Fallback to browser API
    await requestBrowserFullscreen();
  }, []);

  return (
    <TelegramContext.Provider
      value={{
        user,
        initDataRaw: rawInitData,
        isReady,
        isTelegram: true,
        isFullscreen,
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

  usePreventAccidentalClose();

  useEffect(() => {
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
        isFullscreen: false,
        requestFullscreenMode,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

// Initialize SDK globally (before any React rendering)
let sdkInitialized = false;

function initSDK() {
  if (sdkInitialized) return;
  sdkInitialized = true;

  if (isInTelegram()) {
    try {
      init();
      console.log('[Telegram] SDK initialized');
    } catch (e) {
      console.warn('[Telegram] SDK init failed:', e);
    }
  }
}

/**
 * Main Telegram Provider
 * Wraps app with SDK or provides mock data in development
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  // Initialize SDK on first render
  initSDK();

  const isTelegram = isInTelegram();

  if (!isTelegram) {
    return <DevFallback>{children}</DevFallback>;
  }

  return <TelegramInner>{children}</TelegramInner>;
}
