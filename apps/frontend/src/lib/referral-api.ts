import { getTelegramInitData } from './telegram';

export type ReferralStats = {
  referrals: number;
  totalEarnings: number | string;
  currency: string;
  referralLink?: string;
};

export type ReferralLink = {
  link: string;
  code: string;
};

type ReferralStatsResponse = {
  referrals?: unknown;
  totalEarnings?: unknown;
  currency?: unknown;
  referralLink?: unknown;
};

function normalizeApiUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'ws:') parsed.protocol = 'http:';
    if (parsed.protocol === 'wss:') parsed.protocol = 'https:';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
}

function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return normalizeApiUrl(apiUrl);
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketUrl) {
    return normalizeApiUrl(socketUrl);
  }

  const origin = window.location.origin.replace(/\/$/, '');
  return import.meta.env.DEV ? origin : `${origin}/api`;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const maybeMessage = (payload as { message?: unknown }).message;
  if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
    return maybeMessage;
  }

  if (
    Array.isArray(maybeMessage) &&
    maybeMessage.length > 0 &&
    typeof maybeMessage[0] === 'string'
  ) {
    return maybeMessage[0];
  }

  return fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, `Request failed (${response.status})`));
  }

  if (payload === null) {
    throw new Error('Invalid API response');
  }

  return payload as T;
}

function getAuthHeaders(): HeadersInit {
  const initData = getTelegramInitData();
  if (!initData) {
    return {};
  }

  return {
    Authorization: `tma ${initData}`,
    'X-Telegram-Init-Data': initData,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function extractCodeFromLink(link: string): string {
  try {
    const parsed = new URL(link);
    return parsed.searchParams.get('startapp') ?? parsed.searchParams.get('start') ?? '';
  } catch {
    return '';
  }
}

function toReferralStats(payload: ReferralStatsResponse): ReferralStats {
  const referrals = Number(payload.referrals);
  const totalEarnings = payload.totalEarnings;
  const currency = payload.currency;

  return {
    referrals: Number.isFinite(referrals) ? referrals : 0,
    totalEarnings:
      typeof totalEarnings === 'string' || typeof totalEarnings === 'number' ? totalEarnings : 0,
    currency: typeof currency === 'string' && currency.trim().length > 0 ? currency : 'CJ',
    referralLink: typeof payload.referralLink === 'string' ? payload.referralLink : undefined,
  };
}

export async function fetchReferralStats(signal?: AbortSignal): Promise<ReferralStats> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/referral/stats`, {
    signal,
    headers: getAuthHeaders(),
  });

  const payload = await parseJson<ReferralStatsResponse>(response);
  return toReferralStats(payload);
}

export async function fetchReferralLink(signal?: AbortSignal): Promise<ReferralLink> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/referral/link`, {
      signal,
      headers: getAuthHeaders(),
    });
    const payload = await parseJson<unknown>(response);

    if (payload && typeof payload === 'object') {
      const link = (payload as { link?: unknown }).link;
      const code = (payload as { code?: unknown }).code;

      if (typeof link === 'string' && link.trim().length > 0) {
        return {
          link,
          code:
            typeof code === 'string' && code.trim().length > 0 ? code : extractCodeFromLink(link),
        };
      }
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
  }

  const stats = await fetchReferralStats(signal);
  if (!stats.referralLink) {
    throw new Error('Referral link is unavailable');
  }

  return {
    link: stats.referralLink,
    code: extractCodeFromLink(stats.referralLink),
  };
}
