import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  completeTask,
  fetchTasks,
  type TaskItem,
  type TaskVerificationType,
} from '../lib/tasks-api';

type TasksPanelProps = {
  userId?: string | number;
};

const COMPLETION_BADGE_CLASS_MAP: Record<string, string> = {
  AVAILABLE: 'bg-white/10 text-white/80 border border-white/20',
  PENDING: 'bg-amber-500/20 text-amber-100 border border-amber-300/40',
  APPROVED: 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40',
  REJECTED: 'bg-rose-500/20 text-rose-100 border border-rose-300/40',
};

const VERIFICATION_LABEL_KEY_MAP: Record<TaskVerificationType, string> = {
  AUTO: 'tasks.verification.AUTO',
  MANUAL: 'tasks.verification.MANUAL',
  LINK_CLICK: 'tasks.verification.LINK_CLICK',
  CODE_ENTRY: 'tasks.verification.CODE_ENTRY',
};

function toCompletionState(task: TaskItem): 'AVAILABLE' | 'PENDING' | 'APPROVED' | 'REJECTED' {
  const status = task.myCompletion?.status;
  if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
    return status;
  }

  return 'AVAILABLE';
}

function formatReward(amount: string | number, currency?: string | null): string {
  const parsedAmount = Number(amount);
  const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : String(amount);
  const normalizedCurrency = currency && currency.trim().length > 0 ? currency : 'CJ';
  return `${normalizedAmount} ${normalizedCurrency}`;
}

export function TasksPanel({ userId }: TasksPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submittingByTaskId, setSubmittingByTaskId] = useState<Record<string, boolean>>({});

  const loadTasks = useCallback(
    async (signal?: AbortSignal, isManualRefresh = false) => {
      if (!userId) {
        setItems([]);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const nextItems = await fetchTasks(signal);
        setItems(nextItems);
        setError(null);
      } catch {
        setItems([]);
        setError(t('tasks.loadError'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t, userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTasks(controller.signal);

    return () => controller.abort();
  }, [loadTasks]);

  const handleRefresh = async () => {
    setActionMessage(null);
    setActionError(null);
    await loadTasks(undefined, true);
  };

  const handleClaim = async (task: TaskItem) => {
    const completionState = toCompletionState(task);
    if (completionState === 'PENDING' || completionState === 'APPROVED') {
      return;
    }

    setActionMessage(null);
    setActionError(null);
    setSubmittingByTaskId((prev) => ({ ...prev, [task.id]: true }));

    try {
      const completion = await completeTask(task.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                myCompletion: {
                  status: completion.status,
                  submittedAt: completion.submittedAt ?? null,
                },
              }
            : item,
        ),
      );
      setActionMessage(
        completion.status === 'APPROVED' ? t('tasks.claimApproved') : t('tasks.claimSubmitted'),
      );
    } catch {
      setActionError(t('tasks.actionError'));
    } finally {
      setSubmittingByTaskId((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  const hasUser = Boolean(userId);
  const canRenderEmpty = !isLoading && !error && items.length === 0;
  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.title.localeCompare(right.title)),
    [items],
  );

  if (!hasUser) {
    return (
      <section
        className="h-full rounded-xl border border-white/10 bg-black/20 p-4"
        data-testid="tasks-panel"
      >
        <div className="flex h-full items-center justify-center text-center text-sm text-white/70">
          {t('tasks.needUser')}
        </div>
      </section>
    );
  }

  return (
    <section
      className="h-full rounded-xl border border-white/10 bg-black/20 p-4"
      data-testid="tasks-panel"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Meta</p>
          <h4 className="text-sm font-bold uppercase tracking-wide text-lime-100">
            {t('tasks.subtitle')}
          </h4>
        </div>
        <button
          type="button"
          data-testid="tasks-refresh"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-lg border border-lime-300/40 bg-lime-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-lime-100 transition-colors hover:bg-lime-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? t('tasks.refreshing') : t('tasks.refresh')}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      {actionError && (
        <div className="mb-3 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {actionError}
        </div>
      )}
      {actionMessage && (
        <div className="mb-3 rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {actionMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-[75%] items-center justify-center text-sm text-white/70">
          {t('tasks.loading')}
        </div>
      ) : canRenderEmpty ? (
        <div className="flex h-[75%] items-center justify-center text-sm text-white/60">
          {t('tasks.empty')}
        </div>
      ) : (
        <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
          {sortedItems.map((task) => {
            const completionState = toCompletionState(task);
            const isSubmitting = submittingByTaskId[task.id] === true;
            const claimDisabled =
              isSubmitting || completionState === 'PENDING' || completionState === 'APPROVED';
            const rewardLabel = formatReward(task.rewardAmount, task.rewardCurrency);
            const statusLabel = t(`tasks.statuses.${completionState}`);
            const verificationLabel = task.verificationType
              ? t(VERIFICATION_LABEL_KEY_MAP[task.verificationType] ?? 'tasks.verification.AUTO')
              : t('tasks.verification.AUTO');

            return (
              <article
                key={task.id}
                data-testid={`task-item-${task.id}`}
                className="rounded-xl border border-white/10 bg-black/30 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h5 className="truncate text-sm font-semibold text-white">{task.title}</h5>
                    {task.shortDescription ? (
                      <p className="mt-1 text-xs text-white/60">{task.shortDescription}</p>
                    ) : null}
                  </div>
                  <span
                    data-testid={`task-status-${task.id}`}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${COMPLETION_BADGE_CLASS_MAP[completionState]}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] text-white/70">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                    <p className="uppercase tracking-wide text-white/40">{t('tasks.reward')}</p>
                    <p className="mt-0.5 font-semibold text-amber-200">{rewardLabel}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                    <p className="uppercase tracking-wide text-white/40">
                      {t('tasks.verificationLabel')}
                    </p>
                    <p className="mt-0.5 font-semibold text-white/80">{verificationLabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid={`task-claim-${task.id}`}
                  onClick={() => void handleClaim(task)}
                  disabled={claimDisabled}
                  className="w-full rounded-lg border border-lime-300/50 bg-lime-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-lime-100 transition-colors hover:bg-lime-500/30 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:text-white/60"
                >
                  {isSubmitting ? t('tasks.claiming') : t('tasks.claim')}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
