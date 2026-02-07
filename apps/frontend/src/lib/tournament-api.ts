export type TournamentStatus =
  | 'DRAFT'
  | 'ANNOUNCED'
  | 'REGISTRATION'
  | 'STARTED'
  | 'FINISHED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type TournamentCount = {
  participants?: number;
  tables?: number;
};

export type TournamentApiItem = {
  id: string;
  title?: string | null;
  status: TournamentStatus;
  config?: unknown;
  registrationStart?: string | null;
  startTime?: string | null;
  currentStage?: number;
  bracketState?: unknown;
  _count?: TournamentCount;
};

export type TournamentListResponse = {
  items?: TournamentApiItem[];
  total?: number;
  page?: number;
  pageSize?: number;
};

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      const host = window.location.hostname;
      const isLoopbackHost = host === 'localhost' || host === '127.0.0.1';
      const isLoopbackEnv = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

      if (isLoopbackHost && isLoopbackEnv && parsed.hostname !== host) {
        return window.location.origin;
      }
    } catch {
      return envUrl;
    }

    return envUrl;
  }

  return window.location.origin;
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
    const fallback = `Request failed (${response.status})`;
    throw new Error(extractErrorMessage(payload, fallback));
  }

  return payload as T;
}

export async function fetchTournaments(signal?: AbortSignal): Promise<TournamentListResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tournaments?pageSize=20`, { signal });
  return parseJson<TournamentListResponse>(response);
}

export async function fetchTournament(
  id: string,
  signal?: AbortSignal,
): Promise<TournamentApiItem> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tournaments/${id}`, { signal });
  return parseJson<TournamentApiItem>(response);
}

export async function joinTournament(tournamentId: string, userId: string | number): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tournaments/${tournamentId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: String(userId) }),
  });

  await parseJson<unknown>(response);
}

export async function leaveTournament(
  tournamentId: string,
  userId: string | number,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tournaments/${tournamentId}/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: String(userId) }),
  });

  await parseJson<unknown>(response);
}
