import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface Notification {
  id: string;
  type: 'SYSTEM' | 'MARKETING' | 'TOURNAMENT';
  title: string | null;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: limit };
      if (statusFilter) params.status = statusFilter;

      const res = await adminApi.getNotifications(params);
      setNotifications(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [limit, page, statusFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      await adminApi.deleteNotification(notificationId);
      fetchNotifications();
    } catch (err) {
      console.error(err);
      alert('Cannot delete: only DRAFT notifications can be deleted');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400',
      SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400',
      SENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400',
      SENT: 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400',
    };
    return styles[status] || styles.DRAFT;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      SYSTEM: 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400',
      MARKETING: 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-400',
      TOURNAMENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800/20 dark:text-cyan-400',
    };
    return styles[type] || styles.SYSTEM;
  };

  return (
    <>
      <PageMeta title="Notifications | Joker Admin" description="Manage notifications" />
      <PageBreadcrumb pageTitle="Notifications" />

      <div className="space-y-6">
        {/* Filters & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="SENDING">Sending</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
          </select>

          <Link
            to="/notifications/new"
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            + Create Notification
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recipients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
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
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No notifications found
                    </td>
                  </tr>
                ) : (
                  notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadge(notification.type)}`}
                        >
                          {notification.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {notification.title && (
                          <div className="font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {notification.body.slice(0, 60)}
                          {notification.body.length > 60 ? '...' : ''}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(notification.status)}`}
                        >
                          {notification.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {notification.status === 'DRAFT' ? (
                          '—'
                        ) : (
                          <span>
                            {notification.deliveredCount}/{notification.totalRecipients}
                            {notification.failedCount > 0 && (
                              <span className="ml-1 text-red-500">
                                ({notification.failedCount} failed)
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {notification.sentAt
                          ? new Date(notification.sentAt).toLocaleString()
                          : notification.scheduledAt
                            ? `Scheduled: ${new Date(notification.scheduledAt).toLocaleString()}`
                            : new Date(notification.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/notifications/${notification.id}`}
                            className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                          >
                            {notification.status === 'DRAFT' ? 'Edit' : 'View'}
                          </Link>
                          {notification.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                            >
                              Delete
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
