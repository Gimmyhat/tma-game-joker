import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface User {
  id: string;
  tgId: string;
  username: string;
  status: string;
  adminRole: string | null;
  balanceCj: number;
  createdAt: string;
  blockedAt: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: limit };
      if (search) params.search = search;
      if (statusFilter === 'ACTIVE') params.blocked = 'false';
      if (statusFilter === 'BLOCKED') params.blocked = 'true';

      const res = await adminApi.getUsers(params);
      setUsers(res.data.items || res.data.users || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBlock = async (userId: string) => {
    const reason = prompt('Enter block reason:');
    if (!reason) return;

    try {
      await adminApi.blockUser(userId, reason);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await adminApi.unblockUser(userId);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <PageMeta title="Users | Joker Admin" description="Manage users" />
      <PageBreadcrumb pageTitle="Users" />

      <div className="space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Search
            </button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Telegram ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {user.username || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                        {user.tgId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            user.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                        ${user.balanceCj}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                        {user.adminRole || 'User'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/users/${user.id}`}
                            className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                          >
                            View
                          </Link>
                          {user.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleBlock(user.id)}
                              className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                            >
                              Block
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnblock(user.id)}
                              className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                            >
                              Unblock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
