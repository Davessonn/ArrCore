import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Container,
  Cpu,
  Download,
  HardDrive,
  MemoryStick,
  Network,
  Tv,
  Clapperboard,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import "./Index.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SystemStats {
  cpu: { usage: number; cores: number; model: string };
  memory: { total: number; used: number; free: number };
  disk: { total: number; used: number; free: number; path: string }[];
  network: { bytesIn: number; bytesOut: number };
  uptime: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ─── Modules ─────────────────────────────────────────────────────────────────

const modules = [
  {
    name: "Portainer",
    path: "/portainer",
    description: "Docker containers, stacks & status overview.",
    icon: Container,
    color: "#3b82f6",
  },
  {
    name: "Radarr",
    path: "/radarr",
    description: "Movie collections & library management.",
    icon: Clapperboard,
    color: "#ef4444",
  },
  {
    name: "Sonarr",
    path: "/sonarr",
    description: "TV series monitoring & download status.",
    icon: Tv,
    color: "#10b981",
  },
  {
    name: "qBittorrent",
    path: "/qbittorrent",
    description: "Torrent management, speed & status.",
    icon: Download,
    color: "#f59e0b",
  },
  {
    name: "Seerr",
    path: "/seerr",
    description: "Media search & request management.",
    icon: Clapperboard,
    color: "#8b5cf6",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Index = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = () => {
    setLoading(true);
    setError(null);
    fetch("/api/system/stats")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SystemStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const cpuPercent = stats?.cpu.usage ?? 0;
  const memPercent = stats ? (stats.memory.used / stats.memory.total) * 100 : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">System overview & quick navigation.</p>
        </div>
        <button className="dash-refresh-btn" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="dash-error">Failed to load system stats: {error}</div>}

      {/* System Stats */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "rgba(99,102,241,0.12)" }}>
            <Cpu size={22} style={{ color: "#818cf8" }} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{cpuPercent.toFixed(1)}%</span>
            <span className="dash-stat-label">CPU Usage</span>
          </div>
          <div className="dash-stat-bar">
            <div className="dash-stat-bar-fill" style={{ width: `${cpuPercent}%`, background: "#6366f1" }} />
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "rgba(16,185,129,0.12)" }}>
            <MemoryStick size={22} style={{ color: "#34d399" }} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">
              {stats ? formatBytes(stats.memory.used) : "—"}{" "}
              <span className="dash-stat-sub">/ {stats ? formatBytes(stats.memory.total) : "—"}</span>
            </span>
            <span className="dash-stat-label">Memory ({memPercent.toFixed(0)}%)</span>
          </div>
          <div className="dash-stat-bar">
            <div className="dash-stat-bar-fill" style={{ width: `${memPercent}%`, background: "#10b981" }} />
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "rgba(59,130,246,0.12)" }}>
            <Network size={22} style={{ color: "#60a5fa" }} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">
              ↓ {stats ? formatBytes(stats.network.bytesIn) : "—"}
            </span>
            <span className="dash-stat-label">
              ↑ {stats ? formatBytes(stats.network.bytesOut) : "—"} Network
            </span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-icon" style={{ background: "rgba(245,158,11,0.12)" }}>
            <Activity size={22} style={{ color: "#fbbf24" }} />
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-value">{stats ? formatUptime(stats.uptime) : "—"}</span>
            <span className="dash-stat-label">Uptime</span>
          </div>
        </div>
      </div>

      {/* Disk Usage */}
      {stats?.disk && stats.disk.length > 0 && (
        <div className="dash-disks-section">
          <h2 className="dash-section-title"><HardDrive size={18} /> Disk Usage</h2>
          <div className="dash-disks-grid">
            {stats.disk.map((d, i) => {
              const pct = (d.used / d.total) * 100;
              return (
                <div key={i} className="dash-disk-card">
                  <div className="dash-disk-header">
                    <span className="dash-disk-path">{d.path}</span>
                    <span className="dash-disk-pct">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="dash-disk-bar">
                    <div
                      className="dash-disk-bar-fill"
                      style={{ width: `${pct}%`, background: pct > 90 ? "#ef4444" : pct > 75 ? "#f59e0b" : "#10b981" }}
                    />
                  </div>
                  <div className="dash-disk-footer">
                    <span>{formatBytes(d.free)} free</span>
                    <span>{formatBytes(d.total)} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="dash-nav-section">
        <h2 className="dash-section-title">Services</h2>
        <div className="dashboard-grid">
          {modules.map((module) => (
            <Link key={module.path} to={module.path} className="dashboard-card">
              <div className="dashboard-card-icon" style={{ background: `${module.color}15` }}>
                <module.icon size={24} style={{ color: module.color }} />
              </div>
              <div className="dashboard-card-content">
                <h3 className="dashboard-card-title">{module.name}</h3>
                <p className="dashboard-card-desc">{module.description}</p>
              </div>
              <div className="dashboard-card-arrow">
                <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
