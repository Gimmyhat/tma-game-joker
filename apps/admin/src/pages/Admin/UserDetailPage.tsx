import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface UserDetail {
  user: {
    id: string;
    tgId: string;
    username: string | null;
    status: string;
    adminRole: string | null;
    balanceCj: number;
    referralCode: string | null;
    stats: Record<string, unknown> | null;
    settings: Record<string, unknown> | null;
    createdAt: string;
    blockedAt: string | null;
  };
  referrer: { id: string; username: string | null; tgId: string } | null;
  referralsCount: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
  stats: {
    totalTransactions: number;
    totalDeposits: string;
    totalWithdrawals: string;
  };
}

interface Referral {
  id: string;
  username: string | null;
  tgId: string;
  status: string;
  createdAt: string;
}

type TabType = 'transactions' | 'referrals';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  // Transactions state
  const [transactions, setTransactions] = useState<UserDetail['recentTransactions']>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const txLimit = 10;

  // Referrals state
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [refPage, setRefPage] = useState(1);
  const [refTotal, setRefTotal] = useState(0);
  const refLimit = 10;

  const fetchUserDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUserDetail(id);
      setData(res.data);
      setTransactions(res.data.recentTransactions || []);
    } catch {
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!id) return;
    try {
      const res = await adminApi.getUserTransactions(id, { page: txPage, limit: txLimit });
      setTransactions(res.data.transactions || []);
      setTxTotal(res.data.total || 0);
    } catch {
      // Keep existing transactions on error
    }
  };

  const fetchReferrals = async () => {
    if (!id) return;
    try {
      const res = await adminApi.getUserReferrals(id, { page: refPage, limit: refLimit });
      setReferrals(res.data.items || []);
      setRefTotal(res.data.total || 0);
    } catch {
      // Keep existing referrals on error
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [txPage, activeTab, id]);

  useEffect(() => {
    if (activeTab === 'referrals') {
      fetchReferrals();
    }
  }, [refPage, activeTab, id]);

  const handleBlock = async () => {
    if (!id || !data) return;
    const reason = prompt('Enter block reason:');
    if (!reason) return;
    try {
      await adminApi.blockUser(id, reason);
      fetchUserDetail();
    } catch {
      alert('Failed to block user');
    }
  };

  const handleUnblock = async () => {
    if (!id) return;
    try {
      await adminApi.unblockUser(id);
      fetchUserDetail();
    } catch {
      alert('Failed to unblock user');
    }
  };

  const handleAdjustBalance = async () => {
    if (!id) return;
    const amountStr = prompt('Enter amount (positive to add, negative to subtract):');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      alert('Invalid amount');
      return;
    }
    const reason = prompt('Enter reason for adjustment:');
    if (!reason) return;
    try {
      await adminApi.adjustBalance(id, amount, reason);
      fetchUserDetail();
    } catch {
      alert('Failed to adjust balance');
    }
  };

  if (loading) {
    return (
      <>
        <PageMeta title="User Detail | Joker Admin" description="User details" />
        <PageBreadcrumb pageTitle="User Detail" />
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageMeta title="User Detail | Joker Admin" description="User details" />
        <PageBreadcrumb pageTitle="User Detail" />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500">{error || 'User not found'}</div>
          <Link to="/users" className="mt-4 text-blue-500 hover:underline">
            Back to Users
          </Link>
        </div>
      </>
    );
  }

  const { user, referrer, referralsCount, stats } = data;
  const txTotalPages = Math.ceil(txTotal / txLimit);
  const refTotalPages = Math.ceil(refTotal / refLimit);

  return (
    <>
      <PageMeta title={`${user.username || 'User'} | Joker Admin`} description="User details" />
      <PageBreadcrumb pageTitle="User Detail" />

      <div className="space-y-6">
        {/* Back Link */}
        <Link to="/users" className="inline-flex items-center text-blue-500 hover:underline">
          &larr; Back to Users
        </Link>

        {/* Header */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user.username || 'No username'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">TG ID: {user.tgId}</p>
                <div className="mt-1 flex gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                    }`}
                  >
                    {user.status}
                  </span>
                  {user.adminRole && (
                    <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-800/20 dark:text-purple-400">
                      {user.adminRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {user.status === 'ACTIVE' ? (
                <button
                  onClick={handleBlock}
                  className="rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                >
                  Block User
                </button>
              ) : (
                <button
                  onClick={handleUnblock}
                  className="rounded bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
                >
                  Unblock User
                </button>
              )}
              <button
                onClick={handleAdjustBalance}
                className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              >
                Adjust Balance
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Joined: {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Balance Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              ${user.balanceCj}
            </p>
          </div>

          {/* Stats Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalTransactions}
            </p>
            <p className="text-xs text-gray-500">
              Deposits: ${stats.totalDeposits} | Withdrawals: ${stats.totalWithdrawals}
            </p>
          </div>

          {/* Referral Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Referrals</h3>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {referralsCount}
            </p>
            {referrer && (
              <p className="text-xs text-gray-500">
                Referred by:{' '}
                <Link to={`/users/${referrer.id}`} className="text-blue-500 hover:underline">
                  {referrer.username || referrer.tgId}
                </Link>
              </p>
            )}
            {user.referralCode && (
              <p className="text-xs text-gray-500">Code: {user.referralCode}</p>
            )}
          </div>

          {/* Settings Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Settings</h3>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {user.settings ? (
                <ul className="space-y-1">
                  {Object.entries(user.settings)
                    .slice(0, 3)
                    .map(([key, val]) => (
                      <li key={key}>
                        {key}: {String(val)}
                      </li>
                    ))}
                </ul>
              ) : (
                <span className="text-gray-400">Default settings</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'referrals'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Referrals ({referralsCount})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'transactions' && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {tx.type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                          ${tx.amount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              tx.status === 'SUCCESS'
                                ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                : tx.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {txTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
                <div className="text-sm text-gray-500">
                  Page {txPage} of {txTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                    disabled={txPage === txTotalPages}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
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
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No referrals found
                      </td>
                    </tr>
                  ) : (
                    referrals.map((ref) => (
                      <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-6 py-4">
                          <Link
                            to={`/users/${ref.id}`}
                            className="font-medium text-blue-500 hover:underline"
                          >
                            {ref.username || 'No username'}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                          {ref.tgId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              ref.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {refTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
                <div className="text-sm text-gray-500">
                  Page {refPage} of {refTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRefPage((p) => Math.max(1, p - 1))}
                    disabled={refPage === 1}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setRefPage((p) => Math.min(refTotalPages, p + 1))}
                    disabled={refPage === refTotalPages}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
