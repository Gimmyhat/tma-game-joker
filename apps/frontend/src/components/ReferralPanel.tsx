import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ReferralLink,
  type ReferralStats,
  fetchReferralLink,
  fetchReferralStats,
} from '../lib/referral-api';

export function ReferralPanel() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [linkData, setLinkData] = useState<ReferralLink | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, linkDataResponse] = await Promise.all([
        fetchReferralStats(),
        fetchReferralLink(),
      ]);
      setStats(statsData);
      setLinkData(linkDataResponse);
    } catch (err) {
      setError(t('referral.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCopy = async () => {
    if (!linkData?.link) return;
    try {
      await navigator.clipboard.writeText(linkData.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  return (
    <section className="flex h-full flex-col gap-4" data-testid="referral-panel">
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-white/70">
          {t('referral.loading')}
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center text-sm text-rose-300">{error}</div>
      ) : (
        <>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-white/60">
              {t('referral.totalEarnings')}
            </p>
            <div className="mt-1 text-2xl font-black text-amber-400">
              {stats?.totalEarnings ?? '0.00'} <span className="text-sm">CJ</span>
            </div>
            <p className="mt-2 text-[10px] text-white/40">
              {t('referral.invitedCount', { count: stats?.referrals ?? 0 })}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="mb-2 text-xs font-semibold text-white/80">{t('referral.yourLink')}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-black/40 px-3 py-2 text-xs text-white/70">
                {linkData?.link || '...'}
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                {copied ? t('referral.copied') : t('referral.copy')}
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/50">
              {t('referral.description')}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
