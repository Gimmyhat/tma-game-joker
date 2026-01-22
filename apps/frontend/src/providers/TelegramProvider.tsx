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
 * Inner component that uses SDK hooks (inside SDKProvider)
 */
function TelegramInner({ children }: { children: ReactNode }) {
  const initDataRawItem = useInitDataRaw();
  const initData = useInitData();
  const miniApp = useMiniApp();
  const viewport = useViewport();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set initData for socket authentication
    const rawData = initDataRawItem?.result;
    if (typeof rawData === 'string') {
      setInitData(rawData);
    }

    // Expand viewport
    const vp = viewport;
    if (vp && !vp.isExpanded) {
      vp.expand();
    }

    // Signal ready
    const ma = miniApp;
    if (ma) {
      ma.ready();
      setIsReady(true);
    }
  }, [initDataRawItem, viewport, miniApp]);

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
