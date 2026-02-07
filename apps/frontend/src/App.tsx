import { useEffect, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { TelegramProvider, useTelegram } from './providers';
import { useGameStore } from './store';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LobbyTable } from './components/LobbyTable';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { ReferralPanel } from './components/ReferralPanel';
import { TasksPanel } from './components/TasksPanel';
import { TournamentLobbyPanel } from './components/TournamentLobbyPanel';

// Lazy load GameScreen for better initial bundle size
const GameScreen = lazy(() =>
  import('./screens/GameScreen').then((module) => ({ default: module.GameScreen })),
);
// import { RotateDeviceOverlay } from './components/RotateDeviceOverlay';

type BalanceResponse = {
  balance?: string;
  currency?: string;
};

type TransactionItem = {
  id: string;
  amount: string | number;
  type: string;
  status: string;
  createdAt: string;
};

type TransactionsResponse = {
  items?: TransactionItem[];
};

function createMockWalletAddress(): string {
  const randomHex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `0x${randomHex}`;
}

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

/**
 * Lobby screen - shown before game starts
 */
function LobbyScreen() {
  const { t } = useTranslation();
  const { user, isTelegram } = useTelegram();
  const { connectionStatus, lobbyStatus, findGame, leaveQueue } = useGameStore();
  const [balance, setBalance] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState('100');
  const [transferError, setTransferError] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let isActive = true;
    const controller = new AbortController();

    const loadBalance = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/economy/balance/${userId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Balance request failed');
        }

        const data = (await response.json()) as BalanceResponse;
        if (isActive) {
          const value =
            typeof data.balance === 'string'
              ? data.balance
              : data.balance != null
                ? String(data.balance)
                : null;
          setBalance(value);
          setCurrency(typeof data.currency === 'string' ? data.currency : null);
        }
      } catch (error) {
        console.warn('Failed to load user balance', error);
        if (isActive) {
          setBalance(null);
          setCurrency(null);
        }
      }
    };

    loadBalance();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setWalletAddress(null);
      return;
    }

    const key = `joker:wallet:mock:${userId}`;
    const savedAddress = window.localStorage.getItem(key);
    setWalletAddress(savedAddress);
  }, [userId]);

  useEffect(() => {
    if (!isHistoryModalOpen || !userId) return;

    let isActive = true;
    const controller = new AbortController();

    const loadTransactions = async () => {
      setIsHistoryLoading(true);
      setHistoryError(null);

      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/economy/transactions/user/${userId}?pageSize=15`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Transactions request failed');
        }

        const data = (await response.json()) as TransactionsResponse;
        if (isActive) {
          setTransactions(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (isActive) {
          setHistoryError(t('wallet.historyLoadError'));
          setTransactions([]);
        }
      } finally {
        if (isActive) {
          setIsHistoryLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [isHistoryModalOpen, userId, t]);

  const connectMockWallet = () => {
    if (!userId) return;

    const key = `joker:wallet:mock:${userId}`;
    const nextAddress = createMockWalletAddress();
    window.localStorage.setItem(key, nextAddress);
    setWalletAddress(nextAddress);
  };

  const disconnectMockWallet = () => {
    if (!userId) return;

    const key = `joker:wallet:mock:${userId}`;
    window.localStorage.removeItem(key);
    setWalletAddress(null);
  };

  const applyMockTransfer = (txType: 'DEPOSIT' | 'WITHDRAW') => {
    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError(t('wallet.amountInvalid'));
      return;
    }

    const currentBalance = Number(balance ?? '0');
    if (txType === 'WITHDRAW' && amount > currentBalance) {
      setTransferError(t('wallet.insufficientFunds'));
      return;
    }

    setTransferError(null);

    const nextBalance = txType === 'DEPOSIT' ? currentBalance + amount : currentBalance - amount;
    setBalance(nextBalance.toFixed(2));

    const mockTransaction: TransactionItem = {
      id: `mock-${Date.now()}`,
      amount: txType === 'DEPOSIT' ? amount : -amount,
      type: txType,
      status: txType === 'DEPOSIT' ? 'SUCCESS' : 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [mockTransaction, ...prev]);

    setTransferAmount('100');
    if (txType === 'DEPOSIT') {
      setIsDepositModalOpen(false);
    } else {
      setIsWithdrawModalOpen(false);
    }
  };

  return (
    <div
      data-testid="lobby-root"
      className="bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ height: 'var(--tg-viewport-height, 100vh)' }}
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/felt.png')`,
        }}
      />

      <div className="absolute bottom-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center max-w-[320px] mx-auto h-full justify-center">
        {/* Title Section */}
        {(lobbyStatus === 'idle' || connectionStatus !== 'connected') && (
          <div className="text-center text-white w-full mb-4 md:mb-6">
            <h1 className="text-3xl md:text-4xl font-black mb-1 tracking-tighter text-amber-400 drop-shadow-lg">
              {t('lobby.title')}
            </h1>
            <p className="text-xs md:text-sm opacity-80 font-serif italic text-amber-100/60">
              {t('lobby.subtitle')}
            </p>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mb-4 flex items-center justify-center gap-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-400 shadow-[0_0_8px_#4ade80]'
                : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
            }`}
          />
          <span
            data-testid="lobby-connection-status"
            className="text-[9px] font-medium text-white/60 uppercase tracking-widest"
          >
            {connectionStatus}
          </span>
        </div>

        {user && (
          <div className="mb-4 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="text-[9px] font-medium text-white/60 uppercase tracking-widest">
                {t('lobby.balance')}
              </span>
              <span className="text-[11px] font-semibold text-amber-200">
                {balance ?? '—'}
                {currency ? ` ${currency}` : ''}
              </span>
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="ml-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:border-amber-300/50 hover:text-amber-100"
              >
                {walletAddress ? t('wallet.connectedShort') : t('wallet.connectShort')}
              </button>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:border-sky-300/50 hover:text-sky-100"
              >
                {t('wallet.historyShort')}
              </button>
            </div>
          </div>
        )}

        {/* Main Action Area */}
        <div className="w-full flex flex-col items-center justify-center flex-1 min-h-0">
          {/* Searching/Waiting View: Show Table */}
          {(lobbyStatus === 'searching' ||
            lobbyStatus === 'waiting' ||
            lobbyStatus === 'starting') && (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-500 h-full">
              <div className="w-full flex-1 bg-black/10 rounded-xl overflow-hidden border border-white/5 mb-4 relative min-h-[400px]">
                <LobbyTable />
              </div>

              <button
                onClick={leaveQueue}
                className="py-2.5 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs font-bold uppercase tracking-wider transition-all backdrop-blur-sm shadow-lg shadow-red-900/10 mb-4"
              >
                {t('lobby.leaveQueue')}
              </button>
            </div>
          )}

          {/* Idle View: Show Start Button */}
          {lobbyStatus === 'idle' && connectionStatus === 'connected' && (
            <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl w-full animate-in slide-in-from-bottom-8 duration-700">
              {user && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                    {user.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">
                      {t('lobby.playingAs')}
                    </p>
                    <p className="text-sm font-bold text-white leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={findGame}
                data-testid="find-game-button"
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 p-[1px] shadow-[0_8px_30px_-8px_rgba(245,158,11,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="relative h-full w-full rounded-xl bg-gradient-to-b from-amber-500 to-orange-600 px-4 py-3 transition-all group-hover:bg-opacity-90 flex items-center justify-center gap-2">
                  <span className="text-xl">🃏</span>
                  <span className="relative text-sm font-black uppercase tracking-widest text-white drop-shadow-md">
                    {t('lobby.findGame')}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setIsTournamentModalOpen(true)}
                className="mt-2 w-full rounded-lg border border-sky-300/40 bg-sky-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-sky-100 transition-colors hover:bg-sky-500/25"
              >
                {t('tournament.openLobby')}
              </button>

              <button
                onClick={() => setIsLeaderboardModalOpen(true)}
                data-testid="leaderboard-open"
                className="w-full rounded-lg border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-amber-100 transition-colors hover:bg-amber-500/25"
              >
                {t('leaderboard.open')}
              </button>

              <button
                onClick={() => setIsReferralModalOpen(true)}
                data-testid="referral-open"
                className="mt-2 w-full rounded-lg border border-purple-300/40 bg-purple-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-purple-100 transition-colors hover:bg-purple-500/25"
              >
                {t('referral.open')}
              </button>

              <button
                onClick={() => setIsTasksModalOpen(true)}
                data-testid="tasks-open"
                className="mt-2 w-full rounded-lg border border-lime-300/40 bg-lime-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-lime-100 transition-colors hover:bg-lime-500/25"
              >
                {t('tasks.open')}
              </button>

              {!isTelegram && (
                <p className="text-center text-[9px] text-white/20 mt-2">{t('lobby.devMode')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {isWalletModalOpen && (
        <div className="absolute inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Wallet</p>
                <h3 className="text-lg font-black tracking-tight text-amber-300">
                  {t('wallet.title')}
                </h3>
              </div>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              {t('wallet.mockDisclaimer')}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
                {t('wallet.status')}
              </p>

              {walletAddress ? (
                <>
                  <p className="mb-2 text-sm font-semibold text-emerald-300">
                    {t('wallet.connected')}
                  </p>
                  <p className="mb-3 break-all rounded-lg bg-black/40 px-2 py-1 font-mono text-[11px] text-white/80">
                    {walletAddress}
                  </p>
                  <button
                    onClick={disconnectMockWallet}
                    className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition-colors hover:bg-red-500/20"
                  >
                    {t('wallet.disconnect')}
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-white/80">{t('wallet.notConnected')}</p>
                  <button
                    onClick={connectMockWallet}
                    className="w-full rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-400 to-orange-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-900/30 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {t('wallet.connectAction')}
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setTransferAmount('100');
                  setTransferError(null);
                  setIsDepositModalOpen(true);
                }}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200 transition-colors hover:bg-emerald-500/25"
              >
                {t('wallet.depositAction')}
              </button>
              <button
                onClick={() => {
                  setTransferAmount('100');
                  setTransferError(null);
                  setIsWithdrawModalOpen(true);
                }}
                className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sky-100 transition-colors hover:bg-sky-500/25"
              >
                {t('wallet.withdrawAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className="absolute inset-0 z-[75] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Ledger</p>
                <h3 className="text-lg font-black tracking-tight text-sky-200">
                  {t('wallet.historyTitle')}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-white/10 bg-black/30">
              {isHistoryLoading ? (
                <div className="p-4 text-center text-sm text-white/70">
                  {t('wallet.historyLoading')}
                </div>
              ) : historyError ? (
                <div className="p-4 text-center text-sm text-rose-300">{historyError}</div>
              ) : transactions.length === 0 ? (
                <div className="p-4 text-center text-sm text-white/60">
                  {t('wallet.historyEmpty')}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {transactions.map((tx) => {
                    const amountValue = Number(tx.amount);
                    const isIncome = Number.isFinite(amountValue) ? amountValue > 0 : false;
                    const signedAmount = Number.isFinite(amountValue)
                      ? `${isIncome ? '+' : ''}${amountValue.toFixed(2)} CJ`
                      : `${tx.amount} CJ`;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between gap-3 p-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold uppercase tracking-wide text-white/90">
                            {tx.type.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-1 text-[11px] text-white/50">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              isIncome ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {signedAmount}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isTournamentModalOpen && (
        <div className="absolute inset-0 z-[76] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Arena</p>
                <h3 className="text-lg font-black tracking-tight text-sky-200">
                  {t('tournament.title')}
                </h3>
              </div>
              <button
                onClick={() => setIsTournamentModalOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="h-[58vh] min-h-[360px]">
              <TournamentLobbyPanel userId={userId} />
            </div>
          </div>
        </div>
      )}

      {isLeaderboardModalOpen && (
        <div className="absolute inset-0 z-[77] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Ranking</p>
                <h3 className="text-lg font-black tracking-tight text-amber-200">
                  {t('leaderboard.title')}
                </h3>
              </div>
              <button
                onClick={() => setIsLeaderboardModalOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="h-[58vh] min-h-[360px]">
              <LeaderboardPanel />
            </div>
          </div>
        </div>
      )}

      {isReferralModalOpen && (
        <div className="absolute inset-0 z-[78] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Invite</p>
                <h3 className="text-lg font-black tracking-tight text-purple-200">
                  {t('referral.title')}
                </h3>
              </div>
              <button
                onClick={() => setIsReferralModalOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="h-[40vh] min-h-[300px]">
              <ReferralPanel />
            </div>
          </div>
        </div>
      )}

      {isTasksModalOpen && (
        <div className="absolute inset-0 z-[79] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">Missions</p>
                <h3 className="text-lg font-black tracking-tight text-lime-200">
                  {t('tasks.title')}
                </h3>
              </div>
              <button
                onClick={() => setIsTasksModalOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="h-[50vh] min-h-[340px]">
              <TasksPanel userId={userId} />
            </div>
          </div>
        </div>
      )}

      {isDepositModalOpen && (
        <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <h3 className="mb-3 text-lg font-black text-emerald-300">{t('wallet.depositTitle')}</h3>
            <p className="mb-2 text-xs text-white/70">{t('wallet.amountLabel')}</p>
            <input
              type="number"
              min="1"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              className="mb-3 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-emerald-300/60"
            />
            {transferError && <p className="mb-3 text-xs text-rose-300">{transferError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => applyMockTransfer('DEPOSIT')}
                className="rounded-lg border border-emerald-300/50 bg-emerald-500/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-100"
              >
                {t('wallet.confirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isWithdrawModalOpen && (
        <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-sky-400/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-black/50">
            <h3 className="mb-3 text-lg font-black text-sky-200">{t('wallet.withdrawTitle')}</h3>
            <p className="mb-2 text-xs text-white/70">{t('wallet.amountLabel')}</p>
            <input
              type="number"
              min="1"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              className="mb-3 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-sky-300/60"
            />
            {transferError && <p className="mb-3 text-xs text-rose-300">{transferError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => applyMockTransfer('WITHDRAW')}
                className="rounded-lg border border-sky-300/50 bg-sky-500/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-100"
              >
                {t('wallet.confirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main game content - decides whether to show Lobby or Game
 */
function GameContent() {
  const { t } = useTranslation();
  const { user, isReady } = useTelegram();
  const { gameState, initialize } = useGameStore();

  // Initialize store when Telegram is ready
  useEffect(() => {
    if (isReady && user) {
      initialize(user);
    }
  }, [isReady, user, initialize]);

  // Loading state with timeout error display
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // If not ready after 5 seconds, show debug info
    const timer = setTimeout(() => {
      if (!isReady) {
        setInitError('Initialization timeout. Check network or SSL.');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isReady]);

  if (!isReady) {
    return (
      <div className="min-h-full bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm opacity-60 animate-pulse">{t('lobby.initializing')}</p>
        </div>

        {initError && (
          <div className="mt-8 p-4 bg-black/40 rounded-xl border border-red-500/30 backdrop-blur-sm max-w-xs animate-in fade-in slide-in-from-bottom-4">
            <p className="text-red-400 text-xs font-mono mb-2">⚠️ Error Report</p>
            <p className="text-white/80 text-xs mb-4">{initError}</p>
            <p className="text-white/40 text-[10px] break-all mb-4">UA: {navigator.userAgent}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors"
            >
              Reload App
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show GameScreen if game is active, otherwise show Lobby
  const isGameActive = gameState && gameState.phase !== 'waiting' && gameState.phase !== 'finished';

  if (isGameActive) {
    return (
      <Suspense
        fallback={
          <div className="min-h-full bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        }
      >
        <GameScreen />
      </Suspense>
    );
  }

  return <LobbyScreen />;
}

/**
 * Root App component
 */
function App() {
  return (
    <TelegramProvider>
      {/* <RotateDeviceOverlay /> Removed for Portrait Mode */}
      <GameContent />
    </TelegramProvider>
  );
}

export default App;
