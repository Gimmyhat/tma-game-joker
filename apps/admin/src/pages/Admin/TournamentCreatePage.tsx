import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

function parseJsonObject(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON value must be an object');
  }
  return parsed as Record<string, unknown>;
}

export default function TournamentCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [registrationStart, setRegistrationStart] = useState('');
  const [startTime, setStartTime] = useState('');
  const [currentStage, setCurrentStage] = useState('0');
  const [configJson, setConfigJson] = useState('{\n  "format": "single_elimination"\n}');
  const [botFillJson, setBotFillJson] = useState('{\n  "enabled": true,\n  "targetBots": 0\n}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.createTournament({
        title: title || undefined,
        status,
        registrationStart: registrationStart || undefined,
        startTime: startTime || undefined,
        currentStage: Number(currentStage),
        config: parseJsonObject(configJson),
        botFillConfig: parseJsonObject(botFillJson),
      });

      navigate(`/tournaments/${response.data.id}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create tournament');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Create Tournament | Joker Admin" description="Create a new tournament" />
      <PageBreadcrumb pageTitle="Create Tournament" />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/tournaments" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to tournaments
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Weekend Cup #1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ANNOUNCED">ANNOUNCED</option>
                <option value="REGISTRATION">REGISTRATION</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Registration Start
              </label>
              <input
                type="datetime-local"
                value={registrationStart}
                onChange={(event) => setRegistrationStart(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Current Stage</label>
              <input
                type="number"
                min={0}
                value={currentStage}
                onChange={(event) => setCurrentStage(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Config (JSON)</label>
              <textarea
                value={configJson}
                onChange={(event) => setConfigJson(event.target.value)}
                className="h-36 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bot Fill Config (JSON)
              </label>
              <textarea
                value={botFillJson}
                onChange={(event) => setBotFillJson(event.target.value)}
                className="h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Link to="/tournaments" className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
