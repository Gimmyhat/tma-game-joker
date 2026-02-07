import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface TournamentItem {
  id: string;
  title: string | null;
  status: string;
  registrationStart: string | null;
  startTime: string | null;
  participantsCount: number;
  tablesCount: number;
  createdAt: string;
}

export default function TournamentsPage() {
  const [items, setItems] = useState<TournamentItem[]>([]);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.getTournaments({
        status: status || undefined,
        search: search || undefined,
        page,
        pageSize: 20,
      });
      setItems(response.data.items ?? []);
      setTotalPages(response.data.totalPages ?? 1);
    } catch {
      setError('Failed to load tournaments');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  return (
    <>
      <PageMeta title="Tournaments | Joker Admin" description="Tournament management" />
      <PageBreadcrumb pageTitle="Tournaments" />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by title"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ANNOUNCED">ANNOUNCED</option>
              <option value="REGISTRATION">REGISTRATION</option>
              <option value="STARTED">STARTED</option>
              <option value="FINISHED">FINISHED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>

          <Link
            to="/tournaments/new"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Tournament
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Participants</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tables</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Start Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No tournaments found
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{item.title || 'Untitled'}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.participantsCount}</td>
                      <td className="px-4 py-3">{item.tablesCount}</td>
                      <td className="px-4 py-3">
                        {item.startTime ? new Date(item.startTime).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/tournaments/${item.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} / {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
