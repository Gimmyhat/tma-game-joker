import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

// Simplified types for admin view (mirrors @joker/shared but keeps admin decoupled)
interface Card {
  suit: string;
  rank: string;
}

interface TableCard {
  card: Card;
  playerId: string;
  jokerOption?: {
    suit: string;
    mode: string;
  };
}

interface Player {
  id: string;
  name: string;
  isBot: boolean;
  controlledByBot: boolean;
  connected: boolean;
  hand: Card[];
  bet: number | null;
  tricks: number;
  totalScore: number;
  spoiled: boolean;
}

interface GameState {
  id: string;
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;
  round: number;
  pulka: number;
  cardsPerPlayer: number;
  phase: string;
  trump: string | null;
  trumpCard: Card | null;
  table: TableCard[];
  turnStartedAt: number;
  turnTimeoutMs: number;
  createdAt: number;
  finishedAt: number | null;
  winnerId: string | null;
}

interface TableDetail {
  id: string;
  gameState: GameState;
  connectedPlayers: string[];
  error?: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
  Spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  Hearts: 'text-red-500',
  Diamonds: 'text-red-500',
  Clubs: 'text-gray-800 dark:text-gray-200',
  Spades: 'text-gray-800 dark:text-gray-200',
};

function formatCard(card: Card): { symbol: string; color: string } {
  const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;
  const color = SUIT_COLORS[card.suit] || 'text-gray-600';
  return { symbol: `${card.rank}${suitSymbol}`, color };
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'WAITING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400';
    case 'BIDDING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400';
    case 'PLAYING':
      return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400';
    case 'FINISHED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
    case 'ROUND_END':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
  }
}

export default function TableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [table, setTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchTable = useCallback(async () => {
    if (!id) return;
    try {
      const res = await adminApi.getTable(id);
      if (res.data.error) {
        setError(res.data.error);
        setTable(null);
      } else {
        setTable(res.data);
        setError(null);
      }
    } catch {
      setError('Failed to load table');
      setTable(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTable, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTable]);

  if (loading) {
    return (
      <>
        <PageMeta title="Table | Joker Admin" description="Table details" />
        <PageBreadcrumb pageTitle="Table Details" />
        <div className="py-8 text-center text-gray-500">Loading table...</div>
      </>
    );
  }

  if (error || !table) {
    return (
      <>
        <PageMeta title="Table | Joker Admin" description="Table details" />
        <PageBreadcrumb pageTitle="Table Details" />
        <div className="space-y-4">
          <div className="rounded bg-red-100 p-4 text-red-700 dark:bg-red-800/20 dark:text-red-400">
            {error || 'Table not found'}
          </div>
          <Link to="/tables" className="text-blue-500 hover:underline">
            &larr; Back to Tables
          </Link>
        </div>
      </>
    );
  }

  const { gameState } = table;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <>
      <PageMeta title={`Table ${id?.slice(0, 8)} | Joker Admin`} description="Table God Mode" />
      <PageBreadcrumb pageTitle="Table Details (God Mode)" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/tables" className="text-gray-500 hover:text-gray-700">
              &larr;
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Table: <span className="font-mono">{gameState.id.slice(0, 12)}...</span>
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPhaseColor(gameState.phase)}`}
                >
                  {gameState.phase}
                </span>
                <span>Round {gameState.round}</span>
                <span>|</span>
                <span>Pulka {gameState.pulka + 1}</span>
                <span>|</span>
                <span>{gameState.cardsPerPlayer} cards</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchTable}
              className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Game Info Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Trump */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500">Trump</div>
            <div className="mt-1 text-2xl font-bold">
              {gameState.trump ? (
                <span className={SUIT_COLORS[gameState.trump]}>
                  {SUIT_SYMBOLS[gameState.trump] || gameState.trump}
                </span>
              ) : (
                <span className="text-gray-400">None</span>
              )}
            </div>
            {gameState.trumpCard && (
              <div className="mt-1 text-sm text-gray-500">
                Card:{' '}
                <span className={formatCard(gameState.trumpCard).color}>
                  {formatCard(gameState.trumpCard).symbol}
                </span>
              </div>
            )}
          </div>

          {/* Current Turn */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500">Current Turn</div>
            <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
              {currentPlayer?.name || 'N/A'}
            </div>
            {gameState.turnStartedAt > 0 && (
              <div className="mt-1 text-sm text-gray-500">
                Timeout: {Math.round(gameState.turnTimeoutMs / 1000)}s
              </div>
            )}
          </div>

          {/* Dealer */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500">Dealer</div>
            <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
              {gameState.players[gameState.dealerIndex]?.name || 'N/A'}
            </div>
          </div>

          {/* Game Time */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-sm text-gray-500">Duration</div>
            <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
              {Math.round((Date.now() - gameState.createdAt) / 60000)} min
            </div>
            {gameState.finishedAt && <div className="mt-1 text-sm text-green-600">Finished</div>}
          </div>
        </div>

        {/* Table (cards on table) */}
        {gameState.table.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-3 font-medium text-gray-800 dark:text-white">Cards on Table</h3>
            <div className="flex flex-wrap gap-3">
              {gameState.table.map((tc, idx) => {
                const player = gameState.players.find((p) => p.id === tc.playerId);
                const { symbol, color } = formatCard(tc.card);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className={`text-xl font-bold ${color}`}>{symbol}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {player?.name || tc.playerId.slice(0, 8)}
                    </div>
                    {tc.jokerOption && (
                      <div className="mt-1 text-xs text-purple-500">
                        Joker: {tc.jokerOption.mode}{' '}
                        {SUIT_SYMBOLS[tc.jokerOption.suit] || tc.jokerOption.suit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Players (GOD MODE - show all hands) */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white">
            Players (God Mode - All Hands Visible)
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {gameState.players.map((player, idx) => {
              const isCurrentTurn = idx === gameState.currentPlayerIndex;
              const isDealer = idx === gameState.dealerIndex;
              const isConnected = table.connectedPlayers.includes(player.id) || player.connected;

              return (
                <div
                  key={player.id}
                  className={`rounded-xl border p-4 ${
                    isCurrentTurn
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'
                  }`}
                >
                  {/* Player Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {player.name}
                      </span>
                      {player.isBot && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-800/30 dark:text-purple-400">
                          Bot
                        </span>
                      )}
                      {player.controlledByBot && !player.isBot && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-800/30 dark:text-orange-400">
                          Bot-Controlled
                        </span>
                      )}
                      {isDealer && (
                        <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-800/30 dark:text-yellow-400">
                          Dealer
                        </span>
                      )}
                      {isCurrentTurn && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-800/30 dark:text-blue-400">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        title={isConnected ? 'Connected' : 'Disconnected'}
                      />
                      {player.spoiled && (
                        <span className="text-red-500" title="Spoiled (failed bid this pulka)">
                          ❌
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mb-3 flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Bid: </span>
                      <span className="font-medium">{player.bet !== null ? player.bet : '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tricks: </span>
                      <span className="font-medium">{player.tricks}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Score: </span>
                      <span className="font-medium">{player.totalScore}</span>
                    </div>
                  </div>

                  {/* Hand */}
                  <div>
                    <div className="mb-1 text-xs font-medium text-gray-500">
                      Hand ({player.hand.length} cards):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {player.hand.length > 0 ? (
                        player.hand.map((card, cardIdx) => {
                          const { symbol, color } = formatCard(card);
                          return (
                            <span
                              key={cardIdx}
                              className={`rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 ${color}`}
                            >
                              {symbol}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-sm text-gray-400">No cards</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Winner (if finished) */}
        {gameState.winnerId && (
          <div className="rounded-xl border-2 border-green-500 bg-green-50 p-6 text-center dark:bg-green-900/20">
            <div className="text-lg text-green-800 dark:text-green-400">Game Finished!</div>
            <div className="mt-2 text-2xl font-bold text-green-700 dark:text-green-300">
              Winner:{' '}
              {gameState.players.find((p) => p.id === gameState.winnerId)?.name ||
                gameState.winnerId}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
