import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface TableInfo {
  id: string;
  players: Array<{ id: string; name: string; isBot: boolean; connected: boolean }>;
  phase: string;
  round: number;
  pulka: number;
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getTables();
      setTables(res.data || []);
    } catch {
      setError('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400';
      case 'BIDDING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400';
      case 'PLAYING':
        return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400';
      case 'FINISHED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
    }
  };

  return (
    <>
      <PageMeta title="Tables | Joker Admin" description="Active game tables" />
      <PageBreadcrumb pageTitle="Tables" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Active Tables ({tables.length})
          </h2>
          <button
            onClick={fetchTables}
            className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded bg-red-100 p-3 text-sm text-red-700 dark:bg-red-800/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading tables...</div>
        ) : tables.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-gray-500">No active tables</p>
            <p className="mt-2 text-sm text-gray-400">
              Tables will appear here when players start games
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Link
                key={table.id}
                to={`/tables/${table.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-blue-600"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-500">{table.id.slice(0, 8)}...</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPhaseColor(table.phase)}`}
                  >
                    {table.phase}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Round {table.round}</span>
                  <span>|</span>
                  <span>Pulka {table.pulka + 1}</span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500">Players:</div>
                  {table.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-800 dark:text-white">
                        {player.name}
                        {player.isBot && (
                          <span className="ml-1 text-xs text-purple-500">(Bot)</span>
                        )}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          player.connected ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={player.connected ? 'Connected' : 'Disconnected'}
                      />
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
