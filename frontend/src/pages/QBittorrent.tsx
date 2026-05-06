import { useState, useEffect, useMemo } from "react";
import { Info } from "lucide-react";
import "./QBittorrent.css";

interface Torrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  num_seeds: number;
  num_leechs: number;
  state: string;
  eta: number;
  category: string;
  tags: string;
  added_on: number;
  completion_on: number;
  ratio: number;
  uploaded: number;
  save_path: string;
  tracker: string;
  availability: number;
}

type SortKey = "name" | "size" | "progress" | "dlspeed" | "upspeed" | "ratio" | "added_on";
type StateFilter = "all" | "downloading" | "seeding" | "paused" | "stalled";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatSpeed(bytes: number): string {
  if (bytes === 0) return "—";
  return formatBytes(bytes) + "/s";
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || seconds >= 8640000) return "∞";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatDate(ts: number): string {
  if (ts <= 0) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStateInfo(state: string): { label: string; cls: string } {
  switch (state) {
    case "downloading":
    case "forcedDL":
    case "metaDL":
      return { label: "Downloading", cls: "downloading" };
    case "uploading":
    case "forcedUP":
      return { label: "Seeding", cls: "uploading" };
    case "pausedUP":
    case "pausedDL":
      return { label: "Paused", cls: "paused" };
    case "stalledUP":
    case "stalledDL":
      return { label: "Stalled", cls: "stalled" };
    case "error":
    case "missingFiles":
      return { label: "Error", cls: "error" };
    default:
      return { label: state, cls: "paused" };
  }
}

function getProgressColor(progress: number, state: string): string {
  if (state.includes("paused")) return "#78716c";
  if (progress >= 1) return "#4ade80";
  if (progress > 0.5) return "#60a5fa";
  return "#f59e0b";
}

function matchesStateFilter(state: string, filter: StateFilter): boolean {
  if (filter === "all") return true;
  if (filter === "downloading") return ["downloading", "forcedDL", "metaDL"].includes(state);
  if (filter === "seeding") return ["uploading", "forcedUP"].includes(state);
  if (filter === "paused") return ["pausedUP", "pausedDL"].includes(state);
  if (filter === "stalled") return ["stalledUP", "stalledDL"].includes(state);
  return true;
}

export default function QBittorrent() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("added_on");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Torrent | null>(null);

  useEffect(() => {
    fetch("/qbittorrent.json")
      .then((r) => r.json())
      .then((data) => {
        setTorrents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(torrents.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [torrents]);

  const filtered = useMemo(() => {
    let list = torrents.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (!matchesStateFilter(t.state, stateFilter)) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      return true;
    });

    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return list;
  }, [torrents, search, stateFilter, categoryFilter, sortKey, sortAsc]);

  const stats = useMemo(() => {
    const totalDl = torrents.reduce((s, t) => s + t.dlspeed, 0);
    const totalUp = torrents.reduce((s, t) => s + t.upspeed, 0);
    const totalSize = torrents.reduce((s, t) => s + t.size, 0);
    const downloading = torrents.filter((t) => ["downloading", "forcedDL", "metaDL"].includes(t.state)).length;
    const seeding = torrents.filter((t) => ["uploading", "forcedUP"].includes(t.state)).length;
    return { totalDl, totalUp, totalSize, downloading, seeding, total: torrents.length };
  }, [torrents]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  if (loading) {
    return <div className="qbit-page"><p style={{ color: "#64748b" }}>Loading...</p></div>;
  }

  return (
    <div className="qbit-page">
      <div className="qbit-header">
        <h1>qBittorrent</h1>
      </div>

      {/* Stats */}
      <div className="qbit-stats">
        <div className="qbit-stat-card">
          <span className="label">Download</span>
          <span className="value">{formatSpeed(stats.totalDl)}</span>
          <span className="sub">{stats.downloading} active</span>
        </div>
        <div className="qbit-stat-card">
          <span className="label">Upload</span>
          <span className="value">{formatSpeed(stats.totalUp)}</span>
          <span className="sub">{stats.seeding} seeding</span>
        </div>
        <div className="qbit-stat-card">
          <span className="label">Total Torrents</span>
          <span className="value">{stats.total}</span>
          <span className="sub">{formatBytes(stats.totalSize)} total</span>
        </div>
        <div className="qbit-stat-card">
          <span className="label">Global Ratio</span>
          <span className="value">
            {torrents.length > 0
              ? (torrents.reduce((s, t) => s + t.ratio, 0) / torrents.length).toFixed(2)
              : "0"}
          </span>
          <span className="sub">average ratio</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="qbit-toolbar">
        <input
          className="qbit-search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(["all", "downloading", "seeding", "paused", "stalled"] as StateFilter[]).map((f) => (
          <button
            key={f}
            className={`qbit-filter-btn ${stateFilter === f ? "active" : ""}`}
            onClick={() => setStateFilter(f)}
          >
            {f === "all" ? "All" : f === "downloading" ? "Downloading" : f === "seeding" ? "Seeding" : f === "paused" ? "Paused" : "Stalled"}
          </button>
        ))}
        <select
          className="qbit-search"
          style={{ flex: "none", width: "auto", minWidth: 120 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="qbit-table-wrapper">
        {filtered.length === 0 ? (
          <div className="qbit-empty">No results found</div>
        ) : (
          <table className="qbit-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")}>Name {sortKey === "name" && (sortAsc ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("size")}>Size {sortKey === "size" && (sortAsc ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("progress")}>Progress {sortKey === "progress" && (sortAsc ? "↑" : "↓")}</th>
                <th>State</th>
                <th onClick={() => handleSort("dlspeed")}>↓ Speed {sortKey === "dlspeed" && (sortAsc ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("upspeed")}>↑ Speed {sortKey === "upspeed" && (sortAsc ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("ratio")}>Ratio {sortKey === "ratio" && (sortAsc ? "↑" : "↓")}</th>
                <th>ETA</th>
                <th>Cat.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const stateInfo = getStateInfo(t.state);
                return (
                  <tr key={t.hash}>
                    <td className="qbit-name" title={t.name}>{t.name}</td>
                    <td>{formatBytes(t.size)}</td>
                    <td className="qbit-progress-cell">
                      <div className="qbit-progress-bar">
                        <div
                          className="qbit-progress-fill"
                          style={{
                            width: `${t.progress * 100}%`,
                            background: getProgressColor(t.progress, t.state),
                          }}
                        />
                      </div>
                      <span className="qbit-progress-text">{(t.progress * 100).toFixed(1)}%</span>
                    </td>
                    <td>
                      <span className={`qbit-state ${stateInfo.cls}`}>{stateInfo.label}</span>
                    </td>
                    <td><span className="qbit-speed">{formatSpeed(t.dlspeed)}</span></td>
                    <td><span className="qbit-speed up">{formatSpeed(t.upspeed)}</span></td>
                    <td>{t.ratio.toFixed(2)}</td>
                    <td>{formatEta(t.eta)}</td>
                    <td>{t.category && <span className="qbit-category">{t.category}</span>}</td>
                    <td>
                      <div className="qbit-actions-cell">
                        <button className="qbit-action-btn" title="Details" onClick={() => setSelected(t)}>
                          <Info size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="qbit-detail-overlay" onClick={() => setSelected(null)}>
          <div className="qbit-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.name}</h2>
            <div className="qbit-detail-grid">
              <div className="qbit-detail-item">
                <span className="label">Size</span>
                <span className="value">{formatBytes(selected.size)}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Progress</span>
                <span className="value">{(selected.progress * 100).toFixed(1)}%</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">State</span>
                <span className="value">{getStateInfo(selected.state).label}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Ratio</span>
                <span className="value">{selected.ratio.toFixed(2)}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Uploaded</span>
                <span className="value">{formatBytes(selected.uploaded)}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Seeds / Leeches</span>
                <span className="value">{selected.num_seeds} / {selected.num_leechs}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Added</span>
                <span className="value">{formatDate(selected.added_on)}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Completed</span>
                <span className="value">{formatDate(selected.completion_on)}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Save Path</span>
                <span className="value">{selected.save_path}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Category</span>
                <span className="value">{selected.category || "—"}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Tags</span>
                <span className="value">{selected.tags || "—"}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Availability</span>
                <span className="value">{(selected.availability * 100).toFixed(0)}%</span>
              </div>
            </div>
            <button className="qbit-detail-close" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
