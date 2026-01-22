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

/**
 * Check if running inside Telegram WebApp
 */
export function isInTelegram(): boolean {
  if (typeof window === 'undefined') return false;

  const telegram = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram;
  const webApp = telegram?.WebApp;
  const initData = typeof webApp?.initData === 'string' ? webApp.initData : '';

  if (initData.length > 0) return true;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash,
  );
  const launchParamsKeys = ['tgWebAppData', 'tgWebAppVersion', 'tgWebAppPlatform'];
  const hasLaunchParams = launchParamsKeys.some(
    (key) => searchParams.has(key) || hashParams.has(key),
  );

  return Boolean(webApp && hasLaunchParams);
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
