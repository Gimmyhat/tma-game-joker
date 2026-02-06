import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface Notification {
  id: string;
  type: 'SYSTEM' | 'MARKETING' | 'TOURNAMENT';
  title: string | null;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  targetFilter: { all?: boolean; userIds?: string[] };
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Delivery {
  id: string;
  userId: string;
  username: string | null;
  tgId: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  errorMessage: string | null;
}

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [notification, setNotification] = useState<Notification | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [type, setType] = useState<'SYSTEM' | 'MARKETING' | 'TOURNAMENT'>('SYSTEM');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAll, setTargetAll] = useState(true);
  const [targetUserIds, setTargetUserIds] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Deliveries pagination
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const deliveryLimit = 10;

  const fetchDeliveries = useCallback(async () => {
    if (isNew || !id) return;
    try {
      const res = await adminApi.getNotificationDeliveries(id, {
        page: deliveryPage,
        pageSize: deliveryLimit,
      });
      setDeliveries(res.data.items || []);
      setDeliveryTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    }
  }, [deliveryLimit, deliveryPage, id, isNew]);

  const fetchNotification = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await adminApi.getNotification(id!);
      const n = res.data;
      setNotification(n);
      setType(n.type);
      setTitle(n.title || '');
      setBody(n.body);
      setTargetAll(n.targetFilter?.all !== false);
      setTargetUserIds(n.targetFilter?.userIds?.join(', ') || '');
      setScheduledAt(n.scheduledAt ? n.scheduledAt.slice(0, 16) : '');

      // Fetch deliveries if notification was sent
      if (n.status !== 'DRAFT') {
        await fetchDeliveries();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load notification');
    } finally {
      setLoading(false);
    }
  }, [fetchDeliveries, id, isNew]);

  useEffect(() => {
    fetchNotification();
  }, [fetchNotification]);

  useEffect(() => {
    if (!isNew && notification && notification.status !== 'DRAFT') {
      fetchDeliveries();
    }
  }, [fetchDeliveries, isNew, notification]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError('Body is required');
      return;
    }

    setSaving(true);
    setError('');

    const targetFilter = targetAll
      ? { all: true }
      : {
          all: false,
          userIds: targetUserIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        };

    try {
      if (isNew) {
        await adminApi.createNotification({
          type,
          title: title || undefined,
          body,
          targetFilter,
          scheduledAt: scheduledAt || undefined,
        });
      } else {
        await adminApi.updateNotification(id!, {
          type,
          title: title || undefined,
          body,
          targetFilter,
          scheduledAt: scheduledAt || undefined,
        });
      }
      navigate('/notifications');
    } catch (err) {
      console.error(err);
      setError('Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!id || isNew) return;
    if (!confirm('Are you sure you want to send this notification now?')) return;

    setSending(true);
    setError('');

    try {
      const res = await adminApi.sendNotification(id);
      alert(
        `Notification sent! Delivered: ${res.data.delivered}/${res.data.totalRecipients}, Failed: ${res.data.failed}`,
      );
      fetchNotification();
    } catch (err) {
      console.error(err);
      setError('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400',
      DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400',
    };
    return styles[status] || styles.PENDING;
  };

  const canEdit = isNew || notification?.status === 'DRAFT' || notification?.status === 'SCHEDULED';
  const canSend =
    !isNew && (notification?.status === 'DRAFT' || notification?.status === 'SCHEDULED');
  const deliveryTotalPages = Math.ceil(deliveryTotal / deliveryLimit);

  if (loading) {
    return (
      <>
        <PageMeta title="Notification | Joker Admin" description="Notification details" />
        <PageBreadcrumb pageTitle="Notification" />
        <div className="py-8 text-center">Loading...</div>
      </>
    );
  }

  if (!isNew && !notification) {
    return (
      <>
        <PageMeta title="Notification | Joker Admin" description="Notification details" />
        <PageBreadcrumb pageTitle="Notification" />
        <div className="py-8 text-center text-red-500">Notification not found</div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={
          isNew
            ? 'New Notification | Joker Admin'
            : `${notification?.title || 'Notification'} | Joker Admin`
        }
        description="Notification details"
      />
      <PageBreadcrumb pageTitle={isNew ? 'New Notification' : 'Edit Notification'} />

      <div className="space-y-6" data-testid="notification-detail-page">
        {/* Back link */}
        <Link
          to="/notifications"
          className="text-blue-500 hover:underline"
          data-testid="notification-back-link"
        >
          ← Back to Notifications
        </Link>

        {/* Edit Form */}
        <div
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
          data-testid="notification-form"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-gray-900 dark:text-white"
              data-testid="notification-form-heading"
            >
              {isNew ? 'Create Notification' : canEdit ? 'Edit Notification' : 'View Notification'}
            </h2>
            {notification && (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  notification.status === 'SENT'
                    ? 'bg-green-100 text-green-800'
                    : notification.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : notification.status === 'SENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {notification.status}
              </span>
            )}
          </div>

          {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                disabled={!canEdit}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="SYSTEM">System</option>
                <option value="MARKETING">Marketing</option>
                <option value="TOURNAMENT">Tournament</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                placeholder="Notification title"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                disabled={!canEdit}
                rows={4}
                placeholder="Notification message..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                data-testid="notification-body-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Recipients
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={targetAll}
                    onChange={() => setTargetAll(true)}
                    disabled={!canEdit}
                    className="h-4 w-4"
                    data-testid="notification-target-all"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">All users</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!targetAll}
                    onChange={() => setTargetAll(false)}
                    disabled={!canEdit}
                    className="h-4 w-4"
                    data-testid="notification-target-specific"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Specific users
                  </span>
                </label>
              </div>
              {!targetAll && (
                <input
                  type="text"
                  value={targetUserIds}
                  onChange={(e) => setTargetUserIds(e.target.value)}
                  disabled={!canEdit}
                  placeholder="User IDs, comma-separated"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Schedule (optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={!canEdit}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                data-testid="notification-schedule-input"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to send immediately when clicking "Send Now"
              </p>
            </div>

            <div className="flex gap-2">
              {canEdit && (
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                  data-testid="notification-form-submit"
                >
                  {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
                </button>
              )}
              {canSend && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
                  data-testid="notification-send-button"
                >
                  {sending ? 'Sending...' : 'Send Now'}
                </button>
              )}
              <Link
                to="/notifications"
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {canEdit ? 'Cancel' : 'Back'}
              </Link>
            </div>
          </form>
        </div>

        {/* Stats (for sent notifications) */}
        {notification && notification.status !== 'DRAFT' && (
          <div className="grid grid-cols-3 gap-4" data-testid="notification-delivery-stats">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {notification.totalRecipients}
              </div>
              <div className="text-sm text-gray-500">Total Recipients</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="text-2xl font-bold text-green-600">{notification.deliveredCount}</div>
              <div className="text-sm text-gray-500">Delivered</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="text-2xl font-bold text-red-600">{notification.failedCount}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        )}

        {/* Deliveries Table */}
        {notification && notification.status !== 'DRAFT' && (
          <div
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            data-testid="notification-deliveries-table"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Deliveries ({deliveryTotal})
            </h2>

            {deliveries.length === 0 ? (
              <p className="text-gray-500">No deliveries yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Telegram ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Delivered At
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {deliveries.map((d) => (
                      <tr key={d.id}>
                        <td className="whitespace-nowrap px-4 py-2">
                          <Link to={`/users/${d.userId}`} className="text-blue-500 hover:underline">
                            {d.username || d.userId}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {d.tgId}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getDeliveryStatusBadge(d.deliveryStatus)}`}
                          >
                            {d.deliveryStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                          {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-500">{d.errorMessage || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {deliveryTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {(deliveryPage - 1) * deliveryLimit + 1} to{' '}
                  {Math.min(deliveryPage * deliveryLimit, deliveryTotal)} of {deliveryTotal}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeliveryPage((p) => Math.max(1, p - 1))}
                    disabled={deliveryPage === 1}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setDeliveryPage((p) => Math.min(deliveryTotalPages, p + 1))}
                    disabled={deliveryPage === deliveryTotalPages}
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
