import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

type TournamentDetails = {
  id: string;
  title: string | null;
  status: string;
  config: Record<string, unknown>;
  botFillConfig: Record<string, unknown> | null;
  registrationStart: string | null;
  startTime: string | null;
  currentStage: number;
};

type TournamentTable = {
  id: string;
  status: string;
  type: string;
  tournamentStage: number | null;
  createdAt: string;
};

type TournamentParticipant = {
  id: string;
  username: string | null;
  status: string;
  finalPlace: number | null;
  prizeAmount: string | null;
};

export default function TournamentDetailPage() {
  const { id = '' } = useParams();
  const [item, setItem] = useState<TournamentDetails | null>(null);
  const [tables, setTables] = useState<TournamentTable[]>([]);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [registrationStart, setRegistrationStart] = useState('');
  const [startTime, setStartTime] = useState('');
  const [currentStage, setCurrentStage] = useState('0');
  const [configJson, setConfigJson] = useState('{}');
  const [botFillJson, setBotFillJson] = useState('{}');
  const [botCount, setBotCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [tournamentResponse, tablesResponse, participantsResponse] = await Promise.all([
        adminApi.getTournament(id),
        adminApi.getTournamentTables(id),
        adminApi.getTournamentParticipants(id, { page: 1, pageSize: 50 }),
      ]);

      const tournament = tournamentResponse.data as TournamentDetails;
      setItem(tournament);
      setTables(tablesResponse.data ?? []);
      setParticipants(participantsResponse.data.items ?? []);
      setTitle(tournament.title ?? '');
      setStatus(tournament.status);
      setRegistrationStart(
        tournament.registrationStart ? tournament.registrationStart.slice(0, 16) : '',
      );
      setStartTime(tournament.startTime ? tournament.startTime.slice(0, 16) : '');
      setCurrentStage(String(tournament.currentStage ?? 0));
      setConfigJson(JSON.stringify(tournament.config ?? {}, null, 2));
      setBotFillJson(JSON.stringify(tournament.botFillConfig ?? {}, null, 2));
    } catch {
      setError('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const parseJson = (value: string): Record<string, unknown> => {
    if (!value.trim()) return {};
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON value must be an object');
    }
    return parsed as Record<string, unknown>;
  };

  const handleSave = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await adminApi.updateTournament(id, {
        title: title || undefined,
        status,
        registrationStart: registrationStart || null,
        startTime: startTime || null,
        currentStage: Number(currentStage),
        config: parseJson(configJson),
        botFillConfig: parseJson(botFillJson),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tournament');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await adminApi.publishTournament(id);
      await load();
    } catch {
      setError('Failed to publish tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await adminApi.deleteTournament(id);
      await load();
    } catch {
      setError('Failed to delete/cancel tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBots = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await adminApi.addTournamentBots(id, Math.max(1, Number(botCount) || 1));
      await load();
    } catch {
      setError('Failed to add bots');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Tournament Details | Joker Admin" description="Tournament details" />
      <PageBreadcrumb pageTitle="Tournament Details" />

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/tournaments" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to tournaments
          </Link>
          {item && <span className="text-sm text-gray-500">ID: {item.id}</span>}
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !item ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading tournament...
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                    <option value="STARTED">STARTED</option>
                    <option value="FINISHED">FINISHED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
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
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Current Stage
                  </label>
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
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Config (JSON)
                  </label>
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

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="rounded-lg border border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-lg border border-red-400 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                >
                  Delete/Cancel
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={botCount}
                    onChange={(event) => setBotCount(event.target.value)}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleAddBots}
                    disabled={loading}
                    className="rounded-lg border border-violet-400 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 disabled:opacity-50"
                  >
                    Add Bots
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">
                  Tables
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tables.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                            No tables
                          </td>
                        </tr>
                      ) : (
                        tables.map((table) => (
                          <tr key={table.id}>
                            <td className="px-3 py-2">{table.id.slice(0, 8)}...</td>
                            <td className="px-3 py-2">{table.type}</td>
                            <td className="px-3 py-2">{table.status}</td>
                            <td className="px-3 py-2">{table.tournamentStage ?? '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold">
                  Participants
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">User</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Place</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Prize</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {participants.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                            No participants
                          </td>
                        </tr>
                      ) : (
                        participants.map((participant) => (
                          <tr key={participant.id}>
                            <td className="px-3 py-2">{participant.username || participant.id}</td>
                            <td className="px-3 py-2">{participant.status}</td>
                            <td className="px-3 py-2">{participant.finalPlace ?? '-'}</td>
                            <td className="px-3 py-2">{participant.prizeAmount ?? '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
