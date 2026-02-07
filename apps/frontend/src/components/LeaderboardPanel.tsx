import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type LeaderboardEntry,
  type LeaderboardSortBy,
  fetchLeaderboard,
} from '../lib/leaderboard-api';

const SORT_OPTIONS: LeaderboardSortBy[] = ['rating', 'wins', 'games', 'balance'];

function resolveDisplayName(item: LeaderboardEntry): string {
  if (item.username && item.username.trim().length > 0) {
    return item.username;
  }

  return `#${item.tgId}`;
}

export function LeaderboardPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('rating');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(
    async (nextPage = page, nextSort = sortBy) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchLeaderboard({
          page: nextPage,
          pageSize,
          sortBy: nextSort,
          order: 'desc',
        });
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total ?? 0));
      } catch {
        setItems([]);
        setTotal(0);
        setError(t('leaderboard.loadError'));
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, sortBy, t],
  );

  useEffect(() => {
    void loadLeaderboard(page, sortBy);
  }, [loadLeaderboard, page, sortBy]);

  const totalPages = useMemo(() => {
    if (total <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  return (
    <section className="h-full flex flex-col" data-testid="leaderboard-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-white/60">{t('leaderboard.subtitle')}</p>
        <button
          type="button"
          onClick={() => {
            void loadLeaderboard(page, sortBy);
          }}
          data-testid="leaderboard-refresh"
          className="rounded-lg border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-100 transition-colors hover:bg-amber-500/25"
        >
          {t('leaderboard.refresh')}
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {SORT_OPTIONS.map((option) => {
          const isActive = sortBy === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSortBy(option);
                setPage(1);
              }}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                isActive
                  ? 'border-sky-300/50 bg-sky-500/25 text-sky-100'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {t(`leaderboard.sort.${option}`)}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/25">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-white/70">{t('leaderboard.loading')}</div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-rose-300">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-sm text-white/60">{t('leaderboard.empty')}</div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((item) => (
              <article
                key={item.userId}
                data-testid={`leaderboard-row-${item.userId}`}
                className="grid grid-cols-[48px_1fr] gap-2 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/40 bg-amber-500/20 text-sm font-black text-amber-100">
                  #{item.rank}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {resolveDisplayName(item)}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-white/70">
                    <span>
                      {t('leaderboard.columns.rating')}: <b className="text-white">{item.rating}</b>
                    </span>
                    <span>
                      {t('leaderboard.columns.balance')}:{' '}
                      <b className="text-white">{item.balanceCj}</b>
                    </span>
                    <span>
                      {t('leaderboard.columns.wins')}: <b className="text-white">{item.wins}</b>
                    </span>
                    <span>
                      {t('leaderboard.columns.games')}: <b className="text-white">{item.games}</b>
                    </span>
                    <span>
                      {t('leaderboard.columns.winRate')}:{' '}
                      <b className="text-white">{item.winRate}%</b>
                    </span>
                    <span>
                      {t('leaderboard.columns.places')}:{' '}
                      <b className="text-white">{item.places.first}</b>/
                      <b className="text-white">{item.places.second}</b>/
                      <b className="text-white">{item.places.third}</b>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-white/70">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1 || isLoading}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('leaderboard.prev')}
        </button>
        <span>
          {t('leaderboard.page')}: {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages || isLoading}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('leaderboard.next')}
        </button>
      </div>
    </section>
  );
}
