import PageMeta from '../../components/common/PageMeta';
import AdminMetrics from '../../components/admin/AdminMetrics';
import { Link } from 'react-router';

export default function Home() {
  return (
    <>
      <PageMeta title="Dashboard | Joker Admin" description="Joker Game Admin Dashboard" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of your platform</p>
        </div>

        {/* Metrics */}
        <AdminMetrics />

        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/users"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
            >
              <span className="text-gray-800 dark:text-white font-medium">Manage Users</span>
            </Link>
            <Link
              to="/transactions"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-purple-500 hover:bg-purple-50 dark:border-gray-700 dark:hover:border-purple-500 dark:hover:bg-purple-500/10"
            >
              <span className="text-gray-800 dark:text-white font-medium">View Transactions</span>
            </Link>
            <Link
              to="/event-log"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-green-500 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-500 dark:hover:bg-green-500/10"
            >
              <span className="text-gray-800 dark:text-white font-medium">Event Log</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-500/10"
            >
              <span className="text-gray-800 dark:text-white font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
