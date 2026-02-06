import { useCallback, useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface Transaction {
  id: string;
  userId: string;
  user?: { username: string };
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await adminApi.getTransactions(params);
      const transactionsData = Array.isArray(res.data?.transactions)
        ? res.data.transactions
        : Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : [];
      setTransactions(transactionsData);
      setTotal(typeof res.data?.total === 'number' ? res.data.total : transactionsData.length);
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    } finally {
      setLoading(false);
    }
  }, [limit, page, statusFilter, typeFilter]);

  const fetchPending = useCallback(async () => {
    try {
      const res = await adminApi.getPendingWithdrawals();
      const pendingData = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.transactions)
          ? res.data.transactions
          : Array.isArray(res.data?.items)
            ? res.data.items
            : [];
      setPendingWithdrawals(pendingData);
    } catch (e) {
      console.error('Failed to fetch pending', e);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchPending();
  }, [fetchPending, fetchTransactions]);

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveTransaction(id);
      fetchTransactions();
      fetchPending();
    } catch (e) {
      console.error('Failed to approve', e);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await adminApi.rejectTransaction(id, reason);
      fetchTransactions();
      fetchPending();
    } catch (e) {
      console.error('Failed to reject', e);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safePendingWithdrawals = Array.isArray(pendingWithdrawals) ? pendingWithdrawals : [];

  return (
    <>
      <PageMeta title="Transactions | Joker Admin" description="Manage transactions" />
      <div data-testid="transactions-page-header" aria-label="Transactions header">
        <PageBreadcrumb pageTitle="Transactions" />
      </div>

      <div className="space-y-6" data-testid="transactions-page" aria-label="Transactions content">
        {/* Pending Withdrawals Alert */}
        {safePendingWithdrawals.length > 0 && (
          <div
            className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20"
            data-testid="pending-withdrawals-alert"
            role="status"
            aria-live="polite"
          >
            <h3 className="mb-3 font-semibold text-orange-800 dark:text-orange-400">
              {safePendingWithdrawals.length} Pending Withdrawal(s)
            </h3>
            <div className="space-y-2">
              {safePendingWithdrawals.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded bg-white p-2 dark:bg-gray-800"
                >
                  <span className="text-sm">
                    {tx.user?.username || tx.userId} - ${tx.amount}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(tx.id)}
                      className="rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                      data-testid="pending-withdrawal-approve"
                      aria-label="Approve withdrawal"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(tx.id)}
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                      data-testid="pending-withdrawal-reject"
                      aria-label="Reject withdrawal"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          className="flex flex-wrap gap-4"
          data-testid="transactions-filters"
          aria-label="Transaction filters"
        >
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            data-testid="transactions-type-filter"
            aria-label="Type filter"
          >
            <option value="all">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAW">Withdraw</option>
            <option value="GAME_WIN">Game Win</option>
            <option value="GAME_BET">Game Bet</option>
            <option value="REFERRAL_BONUS">Referral Bonus</option>
            <option value="ADMIN_ADJUSTMENT">Admin Adjustment</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            data-testid="transactions-status-filter"
            aria-label="Status filter"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
          data-testid="transactions-table"
          aria-label="Transactions table"
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                  data-testid="transactions-column-user"
                >
                  User
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                  data-testid="transactions-column-type"
                >
                  Type
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                  data-testid="transactions-column-amount"
                >
                  Amount
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                  data-testid="transactions-column-status"
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                  data-testid="transactions-column-date"
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : safeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                safeTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {tx.user?.username || tx.userId.slice(0, 8)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {tx.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          tx.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                            : tx.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400'
                              : tx.status === 'FAILED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
                data-testid="transactions-pagination-prev"
                aria-label="Previous transactions page"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700"
                data-testid="transactions-pagination-next"
                aria-label="Next transactions page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
