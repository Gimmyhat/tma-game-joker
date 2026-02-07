type TaskCompletionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TaskVerificationType = 'AUTO' | 'MANUAL' | 'LINK_CLICK' | 'CODE_ENTRY';

export type TaskItem = {
  id: string;
  title: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  rewardAmount: string | number;
  rewardCurrency?: string | null;
  verificationType?: TaskVerificationType | null;
  myCompletion?: {
    status: TaskCompletionStatus;
    submittedAt?: string | null;
  } | null;
};

type TasksResponse = TaskItem[];

type SubmitTaskCompletionRequest = {
  proofData?: Record<string, unknown>;
};

export type SubmitTaskCompletionResponse = {
  id: string;
  status: TaskCompletionStatus;
  submittedAt?: string | null;
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
      return normalizedSocketUrl;
    }

    return normalizedSocketUrl;
  }

  return window.location.origin;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const rawMessage = (payload as { message?: unknown }).message;
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return rawMessage;
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
    const fallbackMessage = `Request failed (${response.status})`;
    throw new Error(extractErrorMessage(payload, fallbackMessage));
  }

  return payload as T;
}

export async function fetchTasks(signal?: AbortSignal): Promise<TasksResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tasks`, {
    method: 'GET',
    signal,
  });

  const payload = await parseJson<unknown>(response);
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload as TaskItem[];
}

export async function completeTask(
  taskId: string,
  body: SubmitTaskCompletionRequest = {},
): Promise<SubmitTaskCompletionResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return parseJson<SubmitTaskCompletionResponse>(response);
}
