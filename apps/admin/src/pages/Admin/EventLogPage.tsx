import { useCallback, useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { adminApi } from '../../lib/api';

interface EventLogItem {
  id: string;
  eventType: string;
  severity: string;
  actorId: string;
  actorType: string;
  actor?: { username?: string; id?: string };
  targetId: string;
  targetType: string;
  details: Record<string, unknown>;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseDetails(details: unknown): Record<string, unknown> {
  if (isRecord(details)) {
    return details;
  }

  if (typeof details === 'string' && details.trim().length > 0) {
    try {
      const parsed = JSON.parse(details) as unknown;
      return isRecord(parsed) ? parsed : { message: details };
    } catch {
      return { message: details };
    }
  }

  return {};
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shortId(value?: string): string {
  if (!value) return '';
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

function detailsSummary(event: EventLogItem): string {
  const details = event.details;
  const action = details.action;
  if (event.eventType === 'ADMIN_ACTION' && typeof action === 'string') {
    return `Action: ${humanize(action)}`;
  }

  const keys = Object.keys(details);
  if (keys.length === 0) {
    return '-';
  }

  const summary = keys
    .slice(0, 3)
    .map((key) => {
      const rawValue = details[key];
      if (
        typeof rawValue === 'string' ||
        typeof rawValue === 'number' ||
        typeof rawValue === 'boolean'
      ) {
        return `${key}: ${String(rawValue)}`;
      }

      if (Array.isArray(rawValue)) {
        return `${key}: [${rawValue.length}]`;
      }

      if (isRecord(rawValue)) {
        return `${key}: {..}`;
      }

      return `${key}: -`;
    })
    .join(', ');

  return keys.length > 3 ? `${summary}...` : summary;
}

function displayActor(event: EventLogItem): string {
  if (event.actor?.username) return event.actor.username;
  if (event.actorId) return shortId(event.actorId);
  if (event.actorType) return humanize(event.actorType);
  return 'System';
}

function normalizeEventLogItem(item: unknown): EventLogItem | null {
  if (!isRecord(item)) return null;

  const details = parseDetails(item.details);

  const actor = isRecord(item.actor)
    ? {
        username: typeof item.actor.username === 'string' ? item.actor.username : undefined,
        id: typeof item.actor.id === 'string' ? item.actor.id : undefined,
      }
    : isRecord(item.admin)
      ? {
          username: typeof item.admin.username === 'string' ? item.admin.username : undefined,
        }
      : undefined;

  const createdAt =
    typeof item.createdAt === 'string'
      ? item.createdAt
      : item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : new Date().toISOString();

  return {
    id: String(item.id ?? crypto.randomUUID()),
    eventType: String(item.eventType ?? item.action ?? 'UNKNOWN_EVENT').toUpperCase(),
    severity: String(item.severity ?? 'INFO').toUpperCase(),
    actorId: String(item.actorId ?? item.adminId ?? ''),
    actorType: String(item.actorType ?? ''),
    actor,
    targetId: String(item.targetId ?? ''),
    targetType: String(item.targetType ?? ''),
    details,
    createdAt,
  };
}

export default function EventLogPage() {
  const [events, setEvents] = useState<EventLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (eventTypeFilter !== 'all') params.eventType = eventTypeFilter;

      const res = await adminApi.getEventLog(params);
      const payload = (res.data ?? {}) as {
        items?: unknown[];
        events?: unknown[];
        total?: number;
      };
      const fetchedEvents = payload.events ?? payload.items ?? [];
      const normalizedEvents = Array.isArray(fetchedEvents)
        ? fetchedEvents
            .map(normalizeEventLogItem)
            .filter((item): item is EventLogItem => item !== null)
        : [];

      setEvents(normalizedEvents);
      setTotal(typeof payload.total === 'number' ? payload.total : normalizedEvents.length);
    } catch (err) {
      console.error(err);
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter, page, pageSize]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const totalPages = Math.ceil(total / pageSize);
  const displayEvents = Array.isArray(events) ? events : [];

  const getEventColor = (eventType: string) => {
    if (eventType.includes('BANNED') || eventType.includes('REJECTED'))
      return 'bg-red-100 text-red-800';
    if (eventType.includes('APPROVED') || eventType.includes('FINISHED'))
      return 'bg-green-100 text-green-800';
    if (eventType.includes('LOGIN') || eventType.includes('ADMIN_ACTION'))
      return 'bg-blue-100 text-blue-800';
    if (eventType.includes('GOD_MODE') || eventType.includes('CRITICAL'))
      return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'CRITICAL') return 'bg-red-100 text-red-800';
    if (severity === 'WARNING') return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <>
      <PageMeta title="Event Log | Joker Admin" description="Admin activity log" />
      <PageBreadcrumb pageTitle="Event Log" />

      <div className="space-y-6">
        {/* Filter */}
        <div>
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Events</option>
            <option value="ADMIN_ACTION">Admin Actions</option>
            <option value="USER_BANNED">User Banned</option>
            <option value="USER_UNBANNED">User Unbanned</option>
            <option value="BALANCE_ADJUSTED">Balance Adjusted</option>
            <option value="WITHDRAWAL_APPROVED">Withdrawal Approved</option>
            <option value="WITHDRAWAL_REJECTED">Withdrawal Rejected</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Details
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
                ) : displayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No events found
                    </td>
                  </tr>
                ) : (
                  displayEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded px-2 py-1 text-xs ${getEventColor(event.eventType)}`}
                        >
                          {humanize(event.eventType)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded px-2 py-1 text-xs ${getSeverityColor(event.severity)}`}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium">
                        {displayActor(event)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {event.targetType
                          ? `${humanize(event.targetType)} ${shortId(event.targetId)}`
                          : '-'}
                      </td>
                      <td
                        className="max-w-xl px-6 py-4 text-sm text-gray-500"
                        title={JSON.stringify(event.details)}
                      >
                        <div className="truncate">{detailsSummary(event)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
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
