import { useEffect, useState } from 'react';
import {
  UserIcon,
  CheckCircleIcon,
  CloseLineIcon,
  DollarLineIcon,
  TimeIcon,
  BoxIcon,
} from '../../icons';
import { adminApi } from '../../lib/api';

interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalTransactions: number;
  pendingWithdrawals: number;
  totalVolume: number;
}

export default function AdminMetrics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse"
          >
            <div className="h-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Users',
      value: data?.totalUsers ?? 0,
      icon: UserIcon,
      color: 'bg-blue-500',
    },
    {
      label: 'Active Users',
      value: data?.activeUsers ?? 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      label: 'Blocked Users',
      value: data?.blockedUsers ?? 0,
      icon: CloseLineIcon,
      color: 'bg-red-500',
    },
    {
      label: 'Total Transactions',
      value: data?.totalTransactions ?? 0,
      icon: BoxIcon,
      color: 'bg-purple-500',
    },
    {
      label: 'Pending Withdrawals',
      value: data?.pendingWithdrawals ?? 0,
      icon: TimeIcon,
      color: 'bg-orange-500',
    },
    {
      label: 'Total Volume',
      value: `$${(data?.totalVolume ?? 0).toLocaleString()}`,
      icon: DollarLineIcon,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${metric.color}`}
            >
              <metric.icon className="size-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{metric.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
