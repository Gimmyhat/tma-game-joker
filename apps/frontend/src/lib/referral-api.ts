export type ReferralStats = {
  referrals: number;
  totalEarnings: string; // Decimal string
  currency: string;
};

export type ReferralLink = {
  link: string;
  code: string;
};

function getApiBaseUrl(): string {
  const apiEnvUrl = import.meta.env.VITE_API_URL;
  if (apiEnvUrl) {
    try {
      const parsed = new URL(apiEnvUrl);
      if (parsed.protocol === 'ws:') parsed.protocol = 'http:';
      if (parsed.protocol === 'wss:') parsed.protocol = 'https:';
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return apiEnvUrl.replace(/\/$/, '');
    }
  }
  return window.location.origin;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function fetchReferralStats(signal?: AbortSignal): Promise<ReferralStats> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/referral/stats`, { signal });
  return parseJson<ReferralStats>(response);
}

export async function fetchReferralLink(signal?: AbortSignal): Promise<ReferralLink> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/referral/link`, { signal });
  return parseJson<ReferralLink>(response);
}
