import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, TestTube, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import './Settings.css';

interface ServiceConfig {
  serviceName: string;
  url: string;
  apiKey: string | null;
  username: string | null;
  password: string | null;
  configured: boolean;
}

interface AllSettings {
  services: Record<string, ServiceConfig>;
}

interface ServiceMeta {
  key: string;
  label: string;
  logoSrc: string;
  logoAlt: string;
  color: string;
  fields: ('url' | 'apiKey' | 'username' | 'password')[];
}

const SERVICES: ServiceMeta[] = [
  { key: 'grafana', label: 'Grafana', logoSrc: '/logos/grafana.png', logoAlt: 'Grafana logo', color: '#f97316', fields: ['url'] },
  { key: 'sonarr', label: 'Sonarr', logoSrc: '/logos/sonarr.png', logoAlt: 'Sonarr logo', color: '#818cf8', fields: ['url', 'apiKey'] },
  { key: 'radarr', label: 'Radarr', logoSrc: '/logos/radarr.png', logoAlt: 'Radarr logo', color: '#f472b6', fields: ['url', 'apiKey'] },
  { key: 'seerr', label: 'Jellyseerr', logoSrc: '/logos/seerr.png', logoAlt: 'Seerr logo', color: '#a78bfa', fields: ['url', 'apiKey'] },
  { key: 'portainer', label: 'Portainer', logoSrc: '/logos/portainer.png', logoAlt: 'Portainer logo', color: '#34d399', fields: ['url', 'apiKey'] },
  { key: 'qbittorrent', label: 'qBittorrent', logoSrc: '/logos/qBittorrent_Logo.png', logoAlt: 'qBittorrent logo', color: '#60a5fa', fields: ['url', 'username', 'password'] },
];

const FIELD_LABELS: Record<string, string> = {
  url: 'URL',
  apiKey: 'API Key',
  username: 'Username',
  password: 'Password',
};

export default function Settings() {
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data: AllSettings = await res.json();
      setSettings(data);

      const form: Record<string, Record<string, string>> = {};
      for (const [key, config] of Object.entries(data.services)) {
        form[key] = {
          url: config.url || '',
          apiKey: config.apiKey || '',
          username: config.username || '',
          password: config.password || '',
        };
      }
      setFormData(form);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (service: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [service]: { ...prev[service], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload: AllSettings = {
        services: Object.fromEntries(
          Object.entries(formData).map(([key, fields]) => [
            key,
            {
              serviceName: key,
              url: fields.url,
              apiKey: fields.apiKey || null,
              username: fields.username || null,
              password: fields.password || null,
              configured: !!fields.url,
            },
          ])
        ),
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save settings');
      const data: AllSettings = await res.json();
      setSettings(data);
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (serviceName: string) => {
    setTestResults(prev => ({ ...prev, [serviceName]: 'testing' }));
    try {
      const fields = formData[serviceName] || { url: '', apiKey: '', username: '', password: '' };
      const res = await fetch(`/api/settings/test/${serviceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          url: fields.url,
          apiKey: fields.apiKey || null,
          username: fields.username || null,
          password: fields.password || null,
          configured: !!fields.url,
        }),
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [serviceName]: data.success ? 'success' : 'error' }));
    } catch {
      setTestResults(prev => ({ ...prev, [serviceName]: 'error' }));
    }
    setTimeout(() => setTestResults(prev => ({ ...prev, [serviceName]: null })), 4000);
  };

  const toggleSecret = (service: string) => {
    setShowSecrets(prev => ({ ...prev, [service]: !prev[service] }));
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <RefreshCw className="spin" size={20} />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1 className="settings-title">
            <SettingsIcon size={28} />
            Settings
          </h1>
          <p className="settings-subtitle">Configure service connections and API credentials</p>
        </div>
        <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {error && <div className="settings-error">{error}</div>}
      {successMsg && <div className="settings-success"><CheckCircle2 size={16} />{successMsg}</div>}

      <div className="settings-grid">
        {SERVICES.map(service => {
          const testResult = testResults[service.key];
          const isVisible = showSecrets[service.key];

          return (
            <div key={service.key} className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon" style={{ background: `${service.color}20`, color: service.color }}>
                  <img src={service.logoSrc} alt={service.logoAlt} />
                </div>
                <div className="settings-card-title">
                  <h3>{service.label}</h3>
                  <span className={`settings-card-status ${settings?.services[service.key]?.configured ? 'configured' : 'not-configured'}`}>
                    {settings?.services[service.key]?.configured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <div className="settings-card-actions">
                  {service.fields.some(f => f !== 'url') && (
                    <button
                      className="settings-icon-btn"
                      onClick={() => toggleSecret(service.key)}
                      title={isVisible ? 'Hide secrets' : 'Show secrets'}
                    >
                      {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                  <button
                    className={`settings-test-btn ${testResult || ''}`}
                    onClick={() => handleTest(service.key)}
                    disabled={testResult === 'testing'}
                  >
                    {testResult === 'testing' ? (
                      <RefreshCw size={14} className="spin" />
                    ) : testResult === 'success' ? (
                      <CheckCircle2 size={14} />
                    ) : testResult === 'error' ? (
                      <XCircle size={14} />
                    ) : (
                      <TestTube size={14} />
                    )}
                    Test
                  </button>
                </div>
              </div>

              <div className="settings-card-fields">
                {service.fields.map(field => (
                  <div key={field} className="settings-field">
                    <label className="settings-field-label">{FIELD_LABELS[field]}</label>
                    <input
                      type={(!isVisible && field !== 'url') ? 'password' : 'text'}
                      className="settings-field-input"
                      value={formData[service.key]?.[field] || ''}
                      onChange={e => handleChange(service.key, field, e.target.value)}
                      placeholder={`Enter ${service.label} ${FIELD_LABELS[field].toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
