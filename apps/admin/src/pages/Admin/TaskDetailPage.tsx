import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface Task {
  id: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  rewardAmount: string;
  rewardCurrency: string | null;
  status: string;
  autoVerify: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskCompletion {
  id: string;
  userId: string;
  username: string | null;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [rewardAmount, setRewardAmount] = useState('0');
  const [rewardCurrency, setRewardCurrency] = useState('CJ');
  const [status, setStatus] = useState('DRAFT');
  const [autoVerify, setAutoVerify] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTask = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminApi.getTask(id);
      const t = res.data;
      setTask(t);
      setTitle(t.title);
      setShortDescription(t.shortDescription || '');
      setLongDescription(t.longDescription || '');
      setRewardAmount(t.rewardAmount);
      setRewardCurrency(t.rewardCurrency || 'CJ');
      setStatus(t.status);
      setAutoVerify(t.autoVerify);
      setStartDate(t.startDate ? t.startDate.split('T')[0] : '');
      setEndDate(t.endDate ? t.endDate.split('T')[0] : '');

      // Fetch completions
      const compRes = await adminApi.getTaskCompletions(id);
      setCompletions(compRes.data.items || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.updateTask(id, {
        title,
        shortDescription: shortDescription || undefined,
        longDescription: longDescription || undefined,
        rewardAmount: parseFloat(rewardAmount),
        rewardCurrency,
        status,
        autoVerify,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      navigate('/tasks');
    } catch (err) {
      console.error(err);
      setError('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (completionId: string) => {
    try {
      await adminApi.approveTaskCompletion(completionId);
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (completionId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await adminApi.rejectTaskCompletion(completionId, reason);
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (s: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400',
    };
    return styles[s] || styles.PENDING;
  };

  if (loading) {
    return (
      <>
        <PageMeta title="Task | Joker Admin" description="Edit task" />
        <PageBreadcrumb pageTitle="Task" />
        <div className="text-center py-8">Loading...</div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <PageMeta title="Task | Joker Admin" description="Edit task" />
        <PageBreadcrumb pageTitle="Task" />
        <div className="text-center py-8 text-red-500">Task not found</div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`${task.title} | Joker Admin`} description="Edit task" />
      <PageBreadcrumb pageTitle="Edit Task" />

      <div className="space-y-6">
        {/* Back link */}
        <Link to="/tasks" className="text-blue-500 hover:underline">
          ← Back to Tasks
        </Link>

        {/* Edit Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Edit Task</h2>

          {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Short Description
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Long Description
              </label>
              <textarea
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reward Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency
                </label>
                <input
                  type="text"
                  value={rewardCurrency}
                  onChange={(e) => setRewardCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="autoVerify"
                  checked={autoVerify}
                  onChange={(e) => setAutoVerify(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="autoVerify"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  Auto-verify completions
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <Link
                to="/tasks"
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Completions Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Completions ({completions.length})
          </h2>

          {completions.length === 0 ? (
            <p className="text-gray-500">No completions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Submitted
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {completions.map((c) => (
                    <tr key={c.id}>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Link to={`/users/${c.userId}`} className="text-blue-500 hover:underline">
                          {c.username || c.userId}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(c.status)}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {new Date(c.submittedAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {c.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(c.id)}
                              className="rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(c.id)}
                              className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
