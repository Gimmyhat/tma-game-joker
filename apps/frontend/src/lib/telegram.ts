/**
 * Telegram WebApp SDK utilities
 * Uses @telegram-apps/sdk-react hooks
 */

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
}

export interface TelegramTheme {
  backgroundColor: string;
  textColor: string;
  hintColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  secondaryBackgroundColor: string;
}

/**
 * Default theme for development/fallback
 */
export const defaultTheme: TelegramTheme = {
  backgroundColor: '#1a1a2e',
  textColor: '#ffffff',
  hintColor: '#aaaaaa',
  linkColor: '#4fc3f7',
  buttonColor: '#4fc3f7',
  buttonTextColor: '#000000',
  secondaryBackgroundColor: '#16213e',
};

const INIT_DATA_STORAGE_KEY = '__joker_tma_init_data__';
let cachedInitData: string | null = null;

function extractRawParamValue(rawQuery: string, key: string): string | null {
  const query = rawQuery.replace(/^[?#]/, '');
  if (!query) return null;

  const segments = query.split('&');
  for (const segment of segments) {
    if (!segment) continue;

    const separatorIndex = segment.indexOf('=');
    const rawKey = separatorIndex >= 0 ? segment.slice(0, separatorIndex) : segment;
    if (rawKey !== key) continue;

    const rawValue = separatorIndex >= 0 ? segment.slice(separatorIndex + 1) : '';
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

function persistInitData(initData: string): string {
  cachedInitData = initData;

  try {
    sessionStorage.setItem(INIT_DATA_STORAGE_KEY, initData);
  } catch {
    // sessionStorage may be unavailable
  }

  return initData;
}

function readStoredInitData(): string | null {
  if (cachedInitData) {
    return cachedInitData;
  }

  try {
    const stored = sessionStorage.getItem(INIT_DATA_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      cachedInitData = stored;
      return stored;
    }
  } catch {
    // sessionStorage may be unavailable
  }

  return null;
}

/**
 * Check if running inside Telegram WebApp
 * Uses multiple detection methods for iOS/Android compatibility
 */
export function isInTelegram(): boolean {
  if (typeof window === 'undefined') return false;

  // Force dev mode on localhost
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname === '0.0.0.0'
  ) {
    return false;
  }

  // Method 1: Check for Telegram WebApp object with initData
  const telegram = (
    window as Window & { Telegram?: { WebApp?: { initData?: string; platform?: string } } }
  ).Telegram;
  const webApp = telegram?.WebApp;
  const initData = typeof webApp?.initData === 'string' ? webApp.initData : '';

  if (initData.length > 0) return true;

  // Method 2: Check URL parameters (Telegram passes these)
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash,
  );
  const launchParamsKeys = ['tgWebAppData', 'tgWebAppVersion', 'tgWebAppPlatform'];
  const hasLaunchParams = launchParamsKeys.some(
    (key) => searchParams.has(key) || hashParams.has(key),
  );

  // If we have launch params, we're in Telegram (even if webApp not ready yet)
  if (hasLaunchParams) return true;

  // Method 3: Check if WebApp object exists (iOS may have it without initData initially)
  if (webApp && typeof webApp.platform === 'string') return true;

  // Method 4: Check sessionStorage for Telegram data (SDK may have stored it)
  try {
    const storedParams = sessionStorage.getItem('__telegram-mini-apps__');
    if (storedParams) return true;
  } catch {
    // sessionStorage may not be available
  }

  return false;
}

export function getTelegramInitData(): string | null {
  if (typeof window === 'undefined') return null;

  const telegram = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram;
  const initData = typeof telegram?.WebApp?.initData === 'string' ? telegram.WebApp.initData : '';
  if (initData) return persistInitData(initData);

  const rawSearchInitData = extractRawParamValue(window.location.search, 'tgWebAppData');
  if (rawSearchInitData) return persistInitData(rawSearchInitData);

  const rawHashInitData = extractRawParamValue(window.location.hash, 'tgWebAppData');
  if (rawHashInitData) return persistInitData(rawHashInitData);

  return readStoredInitData();
}

/**
 * Development mock user for testing outside Telegram
 */
export function getMockUser(): TelegramUser {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('devUserId');
    const nameParam = params.get('devUserName');

    if (idParam) {
      const parsedId = Number(idParam);
      if (!Number.isNaN(parsedId)) {
        const [firstName, ...rest] = (nameParam || `Dev ${parsedId}`).split(' ');
        const lastName = rest.length > 0 ? rest.join(' ') : undefined;
        return {
          id: parsedId,
          firstName,
          lastName,
          username: nameParam ? nameParam.replace(/\s+/g, '').toLowerCase() : `dev${parsedId}`,
          languageCode: 'ru',
        };
      }
    }
  }

  return {
    id: 123456789,
    firstName: 'Dev',
    lastName: 'User',
    username: 'devuser',
    languageCode: 'ru',
  };
}

/**
 * Development mock initData for testing
 */
export function getMockInitData(): string {
  const user = getMockUser();
  const mockData = {
    user,
    auth_date: Math.floor(Date.now() / 1000),
    hash: 'mock_hash_for_development',
  };
  return `user=${encodeURIComponent(JSON.stringify(mockData.user))}&auth_date=${mockData.auth_date}&hash=${mockData.hash}`;
}
