import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type TournamentApiItem,
  fetchTournament,
  fetchTournaments,
  joinTournament,
  leaveTournament,
} from '../lib/tournament-api';

type TournamentLobbyPanelProps = {
  userId?: string | number;
};

const STATUS_CLASS_MAP: Record<string, string> = {
  DRAFT: 'border-white/20 bg-white/10 text-white/70',
  ANNOUNCED: 'border-sky-300/40 bg-sky-500/15 text-sky-100',
  REGISTRATION: 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100',
  STARTED: 'border-amber-300/40 bg-amber-500/15 text-amber-100',
  FINISHED: 'border-zinc-300/40 bg-zinc-500/15 text-zinc-100',
  CANCELLED: 'border-rose-300/40 bg-rose-500/15 text-rose-100',
  ARCHIVED: 'border-zinc-400/30 bg-zinc-700/20 text-zinc-300',
};

const STATUS_LABEL_KEY_MAP: Record<string, string> = {
  DRAFT: 'tournament.statuses.DRAFT',
  ANNOUNCED: 'tournament.statuses.ANNOUNCED',
  REGISTRATION: 'tournament.statuses.REGISTRATION',
  STARTED: 'tournament.statuses.STARTED',
  FINISHED: 'tournament.statuses.FINISHED',
  CANCELLED: 'tournament.statuses.CANCELLED',
  ARCHIVED: 'tournament.statuses.ARCHIVED',
};

function resolveMaxPlayers(config: unknown): number {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return 16;
  }

  const source = config as Record<string, unknown>;
  const candidates = [source.maxPlayers, source.bracketSize, source.slots];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (value === 16 || value === 32 || value === 64) {
      return value;
    }
  }

  return 16;
}

function formatDate(dateValue?: string | null): string {
  if (!dateValue) {
    return '-';
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
}

export function TournamentLobbyPanel({ userId }: TournamentLobbyPanelProps) {
  const { t } = useTranslation();

  const [items, setItems] = useState<TournamentApiItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<TournamentApiItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({});

  const loadList = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTournaments();
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);

      if (selectedId && !list.some((item) => item.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t('tournament.loadError');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId, t, userId]);

  const loadDetail = useCallback(
    async (tournamentId: string) => {
      setIsDetailLoading(true);
      setError(null);

      try {
        const detail = await fetchTournament(tournamentId);
        setSelectedTournament(detail);
      } catch (requestError) {
        const message =
          requestError instanceof Error ? requestError.message : t('tournament.loadError');
        setError(message);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTournament(null);
      return;
    }

    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const selectedMaxPlayers = useMemo(
    () => resolveMaxPlayers(selectedTournament?.config),
    [selectedTournament?.config],
  );

  const selectedParticipantsCount = selectedTournament?._count?.participants ?? 0;
  const selectedStatus = selectedTournament?.status ?? '';
  const selectedIsJoined = selectedId ? joinedMap[selectedId] === true : false;

  const handleJoin = async () => {
    if (!userId || !selectedId) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      await joinTournament(selectedId, userId);
      setJoinedMap((prev) => ({ ...prev, [selectedId]: true }));
      setActionMessage(t('tournament.joinSuccess'));
      await Promise.all([loadList(), loadDetail(selectedId)]);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t('tournament.actionError');
      setError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!userId || !selectedId) {
      return;
    }

    setIsActionLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      await leaveTournament(selectedId, userId);
      setJoinedMap((prev) => ({ ...prev, [selectedId]: false }));
      setActionMessage(t('tournament.leaveSuccess'));
      await Promise.all([loadList(), loadDetail(selectedId)]);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t('tournament.actionError');
      setError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${STATUS_CLASS_MAP[status] ?? STATUS_CLASS_MAP.DRAFT}`}
    >
      {t(STATUS_LABEL_KEY_MAP[status] ?? 'tournament.statuses.DRAFT')}
    </span>
  );

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-black/20 p-4 text-center text-sm text-white/70">
        {t('tournament.needUser')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
          {t('tournament.subtitle')}
        </p>
        <button
          type="button"
          onClick={() => {
            setActionMessage(null);
            void loadList();
          }}
          disabled={isLoading || isDetailLoading || isActionLoading}
          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:border-amber-300/40 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('tournament.refresh')}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-rose-400/40 bg-rose-500/20 p-2 text-xs text-rose-100">
          {error}
        </p>
      )}

      {actionMessage && (
        <p className="mb-3 rounded-lg border border-emerald-400/40 bg-emerald-500/20 p-2 text-xs text-emerald-100">
          {actionMessage}
        </p>
      )}

      {!selectedId ? (
        <div
          className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20"
          data-scrollable
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-white/70">{t('tournament.loading')}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-sm text-white/70">{t('tournament.empty')}</div>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((item) => {
                const participantsCount = item._count?.participants ?? 0;
                const maxPlayers = resolveMaxPlayers(item.config);

                return (
                  <article key={item.id} className="p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {item.title ?? t('tournament.defaultTitle')}
                        </h4>
                        <p className="mt-1 text-[11px] text-white/60">
                          {t('tournament.players')}: {participantsCount}/{maxPlayers}
                        </p>
                      </div>
                      {renderStatusBadge(item.status)}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] text-white/70">
                      <p>
                        {t('tournament.registrationFrom')}: {formatDate(item.registrationStart)}
                      </p>
                      <p>
                        {t('tournament.startsAt')}: {formatDate(item.startTime)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActionMessage(null);
                        setSelectedId(item.id);
                      }}
                      className="w-full rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-500/30"
                    >
                      {t('tournament.details')}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3"
          data-scrollable
        >
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setError(null);
              setActionMessage(null);
            }}
            className="mb-3 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10"
          >
            {t('tournament.back')}
          </button>

          {isDetailLoading || !selectedTournament ? (
            <div className="p-4 text-center text-sm text-white/70">
              {t('tournament.loadingDetails')}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-black text-white">
                    {selectedTournament.title ?? t('tournament.defaultTitle')}
                  </h4>
                  <p className="mt-1 text-xs text-white/60">
                    {t('tournament.players')}: {selectedParticipantsCount}/{selectedMaxPlayers}
                  </p>
                </div>
                {renderStatusBadge(selectedStatus)}
              </div>

              <div className="mb-4 space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/80">
                <p>
                  <span className="text-white/50">{t('tournament.registrationFrom')}:</span>{' '}
                  {formatDate(selectedTournament.registrationStart)}
                </p>
                <p>
                  <span className="text-white/50">{t('tournament.startsAt')}:</span>{' '}
                  {formatDate(selectedTournament.startTime)}
                </p>
                <p>
                  <span className="text-white/50">{t('tournament.stage')}:</span>{' '}
                  {selectedTournament.currentStage ?? 0}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleJoin();
                  }}
                  disabled={
                    isActionLoading ||
                    selectedStatus !== 'REGISTRATION' ||
                    selectedParticipantsCount >= selectedMaxPlayers
                  }
                  className="rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedIsJoined ? t('tournament.joined') : t('tournament.join')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleLeave();
                  }}
                  disabled={isActionLoading || !selectedIsJoined}
                  className="rounded-lg border border-sky-300/50 bg-sky-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sky-100 transition-colors hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('tournament.leave')}
                </button>
              </div>

              {selectedStatus !== 'REGISTRATION' && (
                <p className="mt-3 text-[11px] text-white/60">
                  {t('tournament.registrationClosed')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
