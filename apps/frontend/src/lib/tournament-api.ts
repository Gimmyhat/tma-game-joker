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

export type TournamentBracketMatchStatus = 'PENDING' | 'COMPLETED';

export type TournamentBracketMatch = {
  id: string;
  stage: number;
  index: number;
  player1UserId: string | null;
  player2UserId: string | null;
  winnerUserId: string | null;
  status: TournamentBracketMatchStatus;
};

export type TournamentBracketStage = {
  stage: number;
  matches: TournamentBracketMatch[];
};

export type TournamentBracketState = {
  format: 'single_elimination';
  size: number;
  currentStage: number;
  finished: boolean;
  winnerUserId: string | null;
  stages: TournamentBracketStage[];
  updatedAt: string;
};

export type TournamentApiItem = {
  id: string;
  title?: string | null;
  status: TournamentStatus;
  config?: unknown;
  registrationStart?: string | null;
  startTime?: string | null;
  currentStage?: number;
  bracketState?: TournamentBracketState | null;
  _count?: TournamentCount;
};

export type TournamentListResponse = {
  items?: TournamentApiItem[];
  total?: number;
  page?: number;
  pageSize?: number;
};

function getApiBaseUrl(): string {
  const normalizeApiUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'ws:') parsed.protocol = 'http:';
      if (parsed.protocol === 'wss:') parsed.protocol = 'https:';
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return url.replace(/\/$/, '');
    }
  };

  const apiEnvUrl = import.meta.env.VITE_API_URL;
  if (apiEnvUrl) {
    return normalizeApiUrl(apiEnvUrl);
  }

  const socketEnvUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketEnvUrl) {
    const normalized = normalizeApiUrl(socketEnvUrl);
    try {
      const parsed = new URL(normalized);
      const host = window.location.hostname;
      const isLoopbackHost = host === 'localhost' || host === '127.0.0.1';
      const isLoopbackEnv = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

      if (isLoopbackHost && isLoopbackEnv && parsed.hostname !== host) {
        return window.location.origin.replace(/\/$/, '');
      }
    } catch {
      return normalized;
    }

    return normalized;
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
    const fallback = `Request failed (${response.status})`;
    throw new Error(extractErrorMessage(payload, fallback));
  }

  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function parseBracketMatch(value: unknown): TournamentBracketMatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id : null;
  const stage = Number(value.stage);
  const index = Number(value.index);
  const status = value.status;

  if (
    !id ||
    !Number.isInteger(stage) ||
    !Number.isInteger(index) ||
    (status !== 'PENDING' && status !== 'COMPLETED')
  ) {
    return null;
  }

  return {
    id,
    stage,
    index,
    player1UserId: toStringOrNull(value.player1UserId),
    player2UserId: toStringOrNull(value.player2UserId),
    winnerUserId: toStringOrNull(value.winnerUserId),
    status,
  };
}

function parseBracketStage(value: unknown): TournamentBracketStage | null {
  if (!isRecord(value)) {
    return null;
  }

  const stage = Number(value.stage);
  if (!Number.isInteger(stage) || !Array.isArray(value.matches)) {
    return null;
  }

  const matches = value.matches
    .map((entry) => parseBracketMatch(entry))
    .filter((entry): entry is TournamentBracketMatch => entry !== null)
    .sort((left, right) => left.index - right.index);

  return {
    stage,
    matches,
  };
}

export function parseTournamentBracketState(value: unknown): TournamentBracketState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.format !== 'single_elimination') {
    return null;
  }

  const size = Number(value.size);
  const currentStage = Number(value.currentStage);
  const finished = value.finished === true;
  const winnerUserId = toStringOrNull(value.winnerUserId);
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;

  if (!Number.isInteger(size) || !Number.isInteger(currentStage) || !updatedAt) {
    return null;
  }

  if (!Array.isArray(value.stages)) {
    return null;
  }

  const stages = value.stages
    .map((entry) => parseBracketStage(entry))
    .filter((entry): entry is TournamentBracketStage => entry !== null)
    .sort((left, right) => left.stage - right.stage);

  return {
    format: 'single_elimination',
    size,
    currentStage,
    finished,
    winnerUserId,
    stages,
    updatedAt,
  };
}

function normalizeTournamentItem(value: unknown): TournamentApiItem {
  const item = value as TournamentApiItem;
  return {
    ...item,
    bracketState: parseTournamentBracketState(item.bracketState),
  };
}

export async function fetchTournaments(signal?: AbortSignal): Promise<TournamentListResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tournaments?pageSize=20`, { signal });
  const payload = await parseJson<unknown>(response);

  if (!isRecord(payload)) {
    throw new Error('Invalid tournaments response');
  }

  return {
    ...payload,
    items: Array.isArray(payload.items)
      ? payload.items.map((item) => normalizeTournamentItem(item))
      : [],
  };
}

export async function fetchTournament(
  id: string,
  signal?: AbortSignal,
): Promise<TournamentApiItem> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tournaments/${id}`, { signal });
  const payload = await parseJson<unknown>(response);

  if (!isRecord(payload)) {
    throw new Error('Invalid tournament response');
  }

  return normalizeTournamentItem(payload);
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
