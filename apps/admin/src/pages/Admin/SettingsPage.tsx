import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { useAuthStore } from '../../lib/auth';
import { adminApi } from '../../lib/api';

interface GlobalSetting {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

// Default settings configuration
const SETTINGS_CONFIG: Record<
  string,
  { label: string; type: 'number' | 'boolean' | 'string'; description: string }
> = {
  house_edge: {
    label: 'House Edge (%)',
    type: 'number',
    description: 'Platform commission percentage',
  },
  referral_bonus: {
    label: 'Referral Bonus',
    type: 'number',
    description: 'Bonus amount for referrals',
  },
  min_bet: { label: 'Minimum Bet', type: 'number', description: 'Minimum bet amount in CJ' },
  max_bet: { label: 'Maximum Bet', type: 'number', description: 'Maximum bet amount in CJ' },
  turn_timeout: {
    label: 'Turn Timeout (sec)',
    type: 'number',
    description: 'Seconds before auto-action on turn',
  },
  bid_timeout: {
    label: 'Bid Timeout (sec)',
    type: 'number',
    description: 'Seconds for placing bid',
  },
  maintenance_mode: {
    label: 'Maintenance Mode',
    type: 'boolean',
    description: 'Disable game access for maintenance',
  },
  min_withdrawal: {
    label: 'Min Withdrawal',
    type: 'number',
    description: 'Minimum withdrawal amount',
  },
  max_withdrawal: {
    label: 'Max Withdrawal',
    type: 'number',
    description: 'Maximum withdrawal amount per day',
  },
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuthStore();

  const [settings, setSettings] = useState<GlobalSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const activeAnchor = location.hash.startsWith('#') ? location.hash.slice(1) : '';

  const sectionTitles: Record<string, string> = {
    profile: 'Edit Profile',
    'account-settings': 'Account Settings',
    support: 'Support',
  };

  const hasAnchorView = Object.prototype.hasOwnProperty.call(sectionTitles, activeAnchor);
  const showGlobalSettings = !hasAnchorView || activeAnchor === 'account-settings';
  const showProfileSection = !hasAnchorView || activeAnchor === 'profile';
  const showAccountActionsSection = !hasAnchorView || activeAnchor === 'account-settings';
  const showSupportSection = !hasAnchorView || activeAnchor === 'support';

  const pageTitle = sectionTitles[activeAnchor] || 'Settings';

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      setSettings(res.data || []);
      // Initialize edited settings with current values
      const initial: Record<string, unknown> = {};
      (res.data || []).forEach((s: GlobalSetting) => {
        initial[s.key] = s.value;
      });
      setEditedSettings(initial);
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const handleChange = (key: string, value: unknown) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const toUpdate = Object.entries(editedSettings).map(([key, value]) => ({
        key,
        value,
        description: SETTINGS_CONFIG[key]?.description,
      }));
      await adminApi.updateSettings(toUpdate);
      setSuccess('Settings saved successfully');
      fetchSettings();
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSetting = async () => {
    const key = prompt('Enter setting key (e.g., new_feature_enabled):');
    if (!key) return;
    const value = prompt('Enter value (number, true/false, or string):');
    if (value === null) return;

    let parsedValue: unknown = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    try {
      await adminApi.updateSetting(key, parsedValue, 'Custom setting');
      fetchSettings();
      setSuccess(`Setting "${key}" added`);
    } catch {
      setError('Failed to add setting');
    }
  };

  const renderSettingInput = (key: string, value: unknown) => {
    const config = SETTINGS_CONFIG[key];
    const type =
      config?.type ||
      (typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string');

    if (type === 'boolean') {
      return (
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={Boolean(editedSettings[key] ?? value)}
            onChange={(e) => handleChange(key, e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
        </label>
      );
    }

    if (type === 'number') {
      return (
        <input
          type="number"
          value={String(editedSettings[key] ?? value ?? '')}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          className="w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      );
    }

    return (
      <input
        type="text"
        value={String(editedSettings[key] ?? value ?? '')}
        onChange={(e) => handleChange(key, e.target.value)}
        className="w-48 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
    );
  };

  return (
    <>
      <PageMeta title={`${pageTitle} | Joker Admin`} description="Admin settings" />
      <PageBreadcrumb pageTitle={pageTitle} />

      <div className="space-y-6">
        {/* Global Settings */}
        {showGlobalSettings && (
          <div
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            data-testid="global-settings-section"
            aria-label="Global settings"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Global Settings
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddSetting}
                  className="rounded bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600"
                  data-testid="add-setting-button"
                  aria-label="Add setting"
                >
                  Add Setting
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
                  data-testid="save-settings-button"
                  aria-label="Save settings"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700 dark:bg-red-800/20 dark:text-red-400"
                data-testid="settings-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700 dark:bg-green-800/20 dark:text-green-400"
                data-testid="settings-success"
                role="status"
                aria-live="polite"
              >
                {success}
              </div>
            )}

            {loading ? (
              <div className="py-8 text-center text-gray-500" data-testid="settings-loading">
                Loading settings...
              </div>
            ) : settings.length === 0 ? (
              <div className="py-8 text-center text-gray-500" data-testid="settings-empty-state">
                No settings configured. Click "Add Setting" to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {settings.map((setting) => {
                  const config = SETTINGS_CONFIG[setting.key];
                  return (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700"
                      data-testid={`setting-row-${setting.key}`}
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {config?.label || setting.key}
                        </div>
                        <div className="text-sm text-gray-500">
                          {setting.description || config?.description || setting.key}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {renderSettingInput(setting.key, setting.value)}
                        <span className="text-xs text-gray-400">
                          {new Date(setting.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Profile Card */}
        {showProfileSection && (
          <div
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            data-testid="profile-section"
            aria-label="Profile information"
            id="profile"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Profile Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700">
                <span className="text-gray-500" data-testid="profile-username-label">
                  Username
                </span>
                <span
                  className="font-medium text-gray-800 dark:text-white"
                  data-testid="profile-username-value"
                >
                  {admin?.username || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-700">
                <span className="text-gray-500" data-testid="profile-role-label">
                  Role
                </span>
                <span
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
                  data-testid="profile-role-value"
                >
                  {admin?.role || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">User ID</span>
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                  {admin?.id || '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {showAccountActionsSection && (
          <div
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            data-testid="account-actions-section"
            aria-label="Account actions"
            id="account-settings"
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Account Actions
            </h2>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-6 py-2 text-white transition hover:bg-red-600"
              data-testid="logout-button"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        )}

        {showSupportSection && (
          <div
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            data-testid="support-section"
            aria-label="Support information"
            id="support"
          >
            <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">Support</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              For admin assistance, contact platform support via your internal support channel.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
