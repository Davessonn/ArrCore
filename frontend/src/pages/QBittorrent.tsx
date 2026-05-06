import { useState, useEffect, useMemo } from "react";
import { Info, Plus, X } from "lucide-react";
import "./QBittorrent.css";

interface Torrent {
  hash: string;
  name: string;
  size: number;
  total_size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  downloaded: number;
  downloaded_session: number;
  num_seeds: number;
  num_leechs: number;
  num_complete: number;
  num_incomplete: number;
  state: string;
  eta: number;
  category: string;
  tags: string;
  added_on: number;
  completion_on: number;
  completed: number;
  ratio: number;
  uploaded: number;
  uploaded_session: number;
  save_path: string;
  content_path: string;
  tracker: string;
  availability: number;
}

type ApiTorrent = Partial<Torrent> & { hash?: string; name?: string };

type SortKey = "name" | "size" | "progress" | "dlspeed" | "upspeed" | "ratio" | "added_on";
type StateFilter = "all" | "downloading" | "seeding" | "paused" | "stalled";

interface AddTorrentForm {
  urls: string;
  savePath: string;
  category: string;
  tags: string;
  rename: string;
  paused: boolean;
  autoTmm: boolean;
  sequentialDownload: boolean;
  firstLastPiecePrio: boolean;
  skipChecking: boolean;
  rootFolder: boolean;
}

interface QBittorrentCategory {
  name: string;
  savePath: string;
}

const POLL_INTERVAL_MS = 3000;

const defaultAddForm = (): AddTorrentForm => ({
  urls: "",
  savePath: "",
  category: "",
  tags: "",
  rename: "",
  paused: false,
  autoTmm: false,
  sequentialDownload: false,
  firstLastPiecePrio: false,
  skipChecking: false,
  rootFolder: false,
});

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

function formatAvailability(availability: number): string {
  if (availability < 0) return "Unknown";
  return `${(availability * 100).toFixed(0)}%`;
}

function normalizeTorrent(torrent: ApiTorrent): Torrent {
  return {
    hash: torrent.hash ?? "",
    name: torrent.name ?? "Unknown torrent",
    size: torrent.size ?? torrent.total_size ?? 0,
    total_size: torrent.total_size ?? torrent.size ?? 0,
    progress: torrent.progress ?? 0,
    dlspeed: torrent.dlspeed ?? 0,
    upspeed: torrent.upspeed ?? 0,
    downloaded: torrent.downloaded ?? 0,
    downloaded_session: torrent.downloaded_session ?? 0,
    num_seeds: torrent.num_seeds ?? 0,
    num_leechs: torrent.num_leechs ?? 0,
    num_complete: torrent.num_complete ?? 0,
    num_incomplete: torrent.num_incomplete ?? 0,
    state: torrent.state ?? "unknown",
    eta: torrent.eta ?? 0,
    category: torrent.category ?? "",
    tags: torrent.tags ?? "",
    added_on: torrent.added_on ?? 0,
    completion_on: torrent.completion_on ?? 0,
    completed: torrent.completed ?? 0,
    ratio: torrent.ratio ?? 0,
    uploaded: torrent.uploaded ?? 0,
    uploaded_session: torrent.uploaded_session ?? 0,
    save_path: torrent.save_path ?? "",
    content_path: torrent.content_path ?? "",
    tracker: torrent.tracker ?? "",
    availability: torrent.availability ?? -1,
  };
}

function getStateInfo(state: string): { label: string; cls: string } {
  switch (state) {
    case "downloading":
    case "forcedDL":
    case "metaDL":
      return { label: "Downloading", cls: "downloading" };
    case "uploading":
    case "forcedUP":
    case "queuedUP":
    case "stalledUP":
      return { label: "Seeding", cls: "uploading" };
    case "pausedUP":
    case "pausedDL":
      return { label: "Paused", cls: "paused" };
    case "stalledDL":
      return { label: "Stalled", cls: "stalled" };
    case "queuedDL":
      return { label: "Queued", cls: "paused" };
    case "checkingUP":
    case "checkingDL":
    case "checkingResumeData":
      return { label: "Checking", cls: "paused" };
    case "allocating":
      return { label: "Allocating", cls: "paused" };
    case "moving":
      return { label: "Moving", cls: "paused" };
    case "error":
    case "missingFiles":
      return { label: "Error", cls: "error" };
    case "unknown":
      return { label: "Unknown", cls: "paused" };
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
  if (filter === "downloading") return ["downloading", "forcedDL", "metaDL", "queuedDL", "checkingDL", "allocating"].includes(state);
  if (filter === "seeding") return ["uploading", "forcedUP", "queuedUP", "checkingUP", "stalledUP"].includes(state);
  if (filter === "paused") return ["pausedUP", "pausedDL"].includes(state);
  if (filter === "stalled") return ["stalledDL"].includes(state);
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
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddTorrentForm>(defaultAddForm);
  const [availableCategories, setAvailableCategories] = useState<QBittorrentCategory[]>([]);

  const loadTorrents = (keepLoading = false) => {
    if (!keepLoading) {
      setLoading((prev) => prev && true);
    }

    return fetch("/api/qbittorrent/torrents")
      .then((r) => r.json())
      .then((data) => {
        setTorrents(Array.isArray(data) ? data.map(normalizeTorrent) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;

    const refreshTorrents = () => {
      fetch("/api/qbittorrent/torrents")
        .then((r) => r.json())
        .then((data) => {
          if (!active) return;
          setTorrents(Array.isArray(data) ? data.map(normalizeTorrent) : []);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setLoading(false);
        });
    };

    refreshTorrents();
    const intervalId = window.setInterval(refreshTorrents, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    fetch("/api/qbittorrent/categories")
      .then((r) => r.json())
      .then((data: Record<string, QBittorrentCategory>) => {
        const items = Object.values(data ?? {}).sort((a, b) => a.name.localeCompare(b.name));
        setAvailableCategories(items);
      })
      .catch(() => setAvailableCategories([]));
  }, []);

  const selected = useMemo(
    () => torrents.find((torrent) => torrent.hash === selectedHash) ?? null,
    [torrents, selectedHash]
  );

  const categories = useMemo(() => {
    const cats = new Set(torrents.map((t) => t.category).filter(Boolean));
    availableCategories.forEach((category) => cats.add(category.name));
    return Array.from(cats).sort();
  }, [torrents, availableCategories]);

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
    const downloading = torrents.filter((t) => ["downloading", "forcedDL", "metaDL", "queuedDL", "checkingDL", "allocating"].includes(t.state)).length;
    const seeding = torrents.filter((t) => ["uploading", "forcedUP", "queuedUP", "checkingUP", "stalledUP"].includes(t.state)).length;
    return { totalDl, totalUp, totalSize, downloading, seeding, total: torrents.length };
  }, [torrents]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  function openAddModal() {
    setSubmitError(null);
    setAddForm((prev) => ({
      ...defaultAddForm(),
      category: categoryFilter !== "all" ? categoryFilter : prev.category,
    }));
    setIsAddOpen(true);
  }

  function closeAddModal() {
    if (isSubmitting) return;
    setIsAddOpen(false);
    setSubmitError(null);
  }

  function updateAddForm<K extends keyof AddTorrentForm>(key: K, value: AddTorrentForm[K]) {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCategoryChange(categoryName: string) {
    const selectedCategory = availableCategories.find((category) => category.name === categoryName);
    setAddForm((prev) => ({
      ...prev,
      category: categoryName,
      savePath: selectedCategory?.savePath ? `/${selectedCategory.savePath.replace(/^\/+/, "")}` : prev.savePath,
    }));
  }

  async function handleAddTorrent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!addForm.urls.trim()) {
      setSubmitError("Torrent URL or magnet link is required.");
      return;
    }

    const payload = new FormData();
    payload.set("urls", addForm.urls.trim());

    if (addForm.savePath.trim()) payload.set("savepath", addForm.savePath.trim());
    if (addForm.category.trim()) payload.set("category", addForm.category.trim());
    if (addForm.tags.trim()) payload.set("tags", addForm.tags.trim());
    if (addForm.rename.trim()) payload.set("rename", addForm.rename.trim());
    if (addForm.paused) payload.set("paused", "true");
    if (addForm.autoTmm) payload.set("autoTMM", "true");
    if (addForm.sequentialDownload) payload.set("sequentialDownload", "true");
    if (addForm.firstLastPiecePrio) payload.set("firstLastPiecePrio", "true");
    if (addForm.skipChecking) payload.set("skip_checking", "true");
    if (addForm.rootFolder) payload.set("root_folder", "true");

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/qbittorrent/torrents/add-form", {
        method: "POST",
        body: payload,
      });

      const message = (await response.text()).trim();

      if (!response.ok) {
        throw new Error(message || "Failed to add torrent.");
      }

      if (message === "Fails.") {
        throw new Error("qBittorrent rejected the torrent request.");
      }

      setIsAddOpen(false);
      setAddForm(defaultAddForm());
      await loadTorrents(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to add torrent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="qbit-page"><p style={{ color: "#64748b" }}>Loading...</p></div>;
  }

  return (
    <div className="qbit-page">
      <div className="qbit-header">
        <h1>qBittorrent</h1>
        <div className="qbit-header-actions">
          <button className="qbit-primary-btn" onClick={openAddModal}>
            <Plus size={16} /> Add torrent
          </button>
        </div>
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
                <th>Save Path</th>
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
                    <td className="qbit-path" title={t.save_path}>{t.save_path || "—"}</td>
                    <td>
                      <div className="qbit-actions-cell">
                        <button className="qbit-action-btn" title="Details" onClick={() => setSelectedHash(t.hash)}>
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

      {isAddOpen && (
        <div className="qbit-detail-overlay" onClick={closeAddModal}>
          <div className="qbit-add-modal" onClick={(e) => e.stopPropagation()}>
            <button className="qbit-modal-close" onClick={closeAddModal} disabled={isSubmitting}>
              <X size={18} />
            </button>
            <h2>Add Torrent</h2>
            <p className="qbit-modal-subtitle">Paste a magnet link or torrent URL and optionally set the target path or category.</p>
            <form className="qbit-add-form" onSubmit={handleAddTorrent}>
              <label className="qbit-form-field qbit-form-field--full">
                <span>Magnet / URL</span>
                <textarea
                  rows={4}
                  value={addForm.urls}
                  onChange={(e) => updateAddForm("urls", e.target.value)}
                  placeholder="magnet:?xt=urn:btih:..."
                />
              </label>
              <label className="qbit-form-field">
                <span>Save Path</span>
                <input
                  value={addForm.savePath}
                  onChange={(e) => updateAddForm("savePath", e.target.value)}
                  placeholder="/torrents/movies/david"
                />
              </label>
              <label className="qbit-form-field">
                <span>Category</span>
                <select
                  value={addForm.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">Select category</option>
                  {availableCategories.map((category) => (
                    <option key={category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="qbit-form-field">
                <span>Tags</span>
                <input
                  value={addForm.tags}
                  onChange={(e) => updateAddForm("tags", e.target.value)}
                  placeholder="movies,4k"
                />
              </label>
              <label className="qbit-form-field">
                <span>Rename</span>
                <input
                  value={addForm.rename}
                  onChange={(e) => updateAddForm("rename", e.target.value)}
                  placeholder="Optional renamed folder"
                />
              </label>

              <div className="qbit-checkbox-grid qbit-form-field--full">
                <label className="qbit-checkbox-field">
                  <input
                    type="checkbox"
                    checked={addForm.paused}
                    onChange={(e) => updateAddForm("paused", e.target.checked)}
                  />
                  <span>Add paused</span>
                </label>
                <label className="qbit-checkbox-field">
                  <input
                    type="checkbox"
                    checked={addForm.autoTmm}
                    onChange={(e) => updateAddForm("autoTmm", e.target.checked)}
                  />
                  <span>Auto TMM</span>
                </label>
                <label className="qbit-checkbox-field">
                  <input
                    type="checkbox"
                    checked={addForm.sequentialDownload}
                    onChange={(e) => updateAddForm("sequentialDownload", e.target.checked)}
                  />
                  <span>Sequential download</span>
                </label>
                <label className="qbit-checkbox-field">
                  <input
                    type="checkbox"
                    checked={addForm.firstLastPiecePrio}
                    onChange={(e) => updateAddForm("firstLastPiecePrio", e.target.checked)}
                  />
                  <span>First/last piece priority</span>
                </label>
                <label className="qbit-checkbox-field">
                  <input
                    type="checkbox"
                    checked={addForm.skipChecking}
                    onChange={(e) => updateAddForm("skipChecking", e.target.checked)}
                  />
                  <span>Skip hash check</span>
                </label>
                <label className="qbit-checkbox-field">
                  <input
                    type="checkbox"
                    checked={addForm.rootFolder}
                    onChange={(e) => updateAddForm("rootFolder", e.target.checked)}
                  />
                  <span>Create root folder</span>
                </label>
              </div>

              {submitError && <div className="qbit-form-error">{submitError}</div>}

              <div className="qbit-form-actions qbit-form-field--full">
                <button type="button" className="qbit-secondary-btn" onClick={closeAddModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="qbit-primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add torrent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="qbit-detail-overlay" onClick={() => setSelectedHash(null)}>
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
                <span className="label">Downloaded</span>
                <span className="value">{formatBytes(selected.downloaded)}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Seeds / Leeches</span>
                <span className="value">{selected.num_seeds} / {selected.num_leechs}</span>
              </div>
              <div className="qbit-detail-item">
                <span className="label">Complete / Incomplete</span>
                <span className="value">{selected.num_complete} / {selected.num_incomplete}</span>
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
                <span className="label">Content Path</span>
                <span className="value">{selected.content_path || "—"}</span>
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
                <span className="value">{formatAvailability(selected.availability)}</span>
              </div>
            </div>
            <button className="qbit-detail-close" onClick={() => setSelectedHash(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
