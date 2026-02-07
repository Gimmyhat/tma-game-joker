export type LeaderboardSortBy = 'rating' | 'wins' | 'games' | 'balance';
export type LeaderboardOrder = 'asc' | 'desc';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  tgId: string;
  username: string | null;
  countryCode: string | null;
  rating: number;
  wins: number;
  games: number;
  winRate: number;
  balanceCj: string;
  places: {
    first: number;
    second: number;
    third: number;
  };
};

export type LeaderboardResponse = {
  items?: LeaderboardEntry[];
  total?: number;
  page?: number;
  pageSize?: number;
  sortBy?: LeaderboardSortBy;
  order?: LeaderboardOrder;
};

export type FetchLeaderboardParams = {
  page?: number;
  pageSize?: number;
  sortBy?: LeaderboardSortBy;
  order?: LeaderboardOrder;
};

function normalizeApiUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol === 'ws:') {
      parsed.protocol = 'http:';
    } else if (parsed.protocol === 'wss:') {
      parsed.protocol = 'https:';
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl
      .replace(/^ws:\/\//i, 'http://')
      .replace(/^wss:\/\//i, 'https://')
      .replace(/\/$/, '');
  }
}

function appendApiPrefix(url: string): string {
  if (import.meta.env.DEV) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, '');

    if (pathname === '' || pathname === '/') {
      parsed.pathname = '/api';
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    const cleanedUrl = url.replace(/\/$/, '');
    return cleanedUrl.endsWith('/api') ? cleanedUrl : `${cleanedUrl}/api`;
  }
}

function getApiBaseUrl(): string {
  const apiEnvUrl = import.meta.env.VITE_API_URL;
  if (apiEnvUrl) {
    return normalizeApiUrl(apiEnvUrl);
  }

  const socketEnvUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketEnvUrl) {
    const normalizedSocketUrl = normalizeApiUrl(socketEnvUrl);

    try {
      const parsed = new URL(normalizedSocketUrl);
      const host = window.location.hostname;
      const isLoopbackHost = host === 'localhost' || host === '127.0.0.1';
      const isLoopbackEnv = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

      if (isLoopbackHost && isLoopbackEnv && parsed.hostname !== host) {
        return window.location.origin;
      }
    } catch {
      return appendApiPrefix(normalizedSocketUrl);
    }

    return appendApiPrefix(normalizedSocketUrl);
  }

  const origin = window.location.origin.replace(/\/$/, '');
  return import.meta.env.DEV ? origin : `${origin}/api`;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }
  }

  return fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    throw new Error(extractErrorMessage(payload, fallback));
  }

  return payload as T;
}

export async function fetchLeaderboard(
  params: FetchLeaderboardParams = {},
  signal?: AbortSignal,
): Promise<LeaderboardResponse> {
  const baseUrl = getApiBaseUrl();
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 20));
  query.set('sortBy', params.sortBy ?? 'rating');
  query.set('order', params.order ?? 'desc');

  const response = await fetch(`${baseUrl}/leaderboard?${query.toString()}`, { signal });
  const payload = await parseJson<LeaderboardResponse>(response);

  return {
    ...payload,
    items: Array.isArray(payload.items) ? payload.items : [],
  };
}
