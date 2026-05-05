import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Database,
  Edit3,
  ExternalLink,
  Filter,
  Film,
  HardDrive,
  LayoutGrid,
  List,
  Play,
  Search,
  Server,
  Square,
  Star,
  Tag,
  Trash2,
  Tv,
  User,
  X,
} from "lucide-react";
import "./Sonarr.css";

interface SonarrImage {
  coverType: string;
  remoteUrl: string;
  url: string;
}

interface SeasonStats {
  episodeCount: number;
  episodeFileCount: number;
  percentOfEpisodes: number;
  releaseGroups: string[];
  seasonCount: number;
  sizeOnDisk: number;
  totalEpisodeCount: number;
}

interface Season {
  monitored: boolean;
  seasonNumber: number;
  statistics: SeasonStats;
}

interface Series {
  id: number;
  title: string;
  year: number;
  status: string;
  network: string;
  overview: string;
  genres: string[];
  images: SonarrImage[];
  path: string;
  rootFolderPath: string;
  runtime: number;
  ratings: { value: number; votes: number };
  seasons: Season[];
  statistics: SeasonStats & { seasonCount: number };
  added: string;
  firstAired: string;
  previousAiring?: string;
  imdbId?: string;
  tags: number[];
  qualityProfileId: number;
}

type SortKey = "title" | "year" | "rating" | "size" | "added" | "percent";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";

const TAG_MAP: Record<number, string> = { 1: "david", 2: "luca", 3: "shared" };
const TAG_COLORS: Record<string, string> = {
  david: "#6366f1",
  luca: "#f59e0b",
  shared: "#10b981",
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const getUser = (rootFolderPath: string) => {
  const parts = rootFolderPath.split("/").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "shared";
};

const getPoster = (images: SonarrImage[]) =>
  images.find((i) => i.coverType === "poster")?.remoteUrl ?? "";

const getFanart = (images: SonarrImage[]) =>
  images.find((i) => i.coverType === "fanart")?.remoteUrl ?? "";

const getTagNames = (tags: number[]) =>
  tags.map((t) => TAG_MAP[t] ?? `tag-${t}`);

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="sonarr-stat-card">
      <div className="sonarr-stat-icon" style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="sonarr-stat-info">
        <span className="sonarr-stat-value">{value}</span>
        <span className="sonarr-stat-label">{label}</span>
      </div>
    </div>
  );
}

function SeriesModal({
  series: s,
  onClose,
  onDelete,
  onEdit,
}: {
  series: Series;
  onClose: () => void;
  onDelete: (id: number) => void;
  onEdit: (s: Series) => void;
}) {
  const fanart = getFanart(s.images);
  const poster = getPoster(s.images);
  const user = getUser(s.rootFolderPath);
  const tags = getTagNames(s.tags);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <div
          className="modal-hero"
          style={{ backgroundImage: fanart ? `url(${fanart})` : undefined }}
        >
          <div className="modal-hero-overlay" />
          <div className="modal-hero-inner">
            {poster && <img src={poster} alt={s.title} className="modal-poster" />}
            <div className="modal-hero-info">
              <h2>
                {s.title} <span>({s.year})</span>
              </h2>
              <div className="modal-meta-row">
                <span className={`sonarr-status-badge sonarr-status-${s.status}`}>
                  {s.status}
                </span>
                <span>
                  <User size={13} /> {user}
                </span>
                <span>
                  <Calendar size={13} /> {s.network}
                </span>
                <span>
                  <Clock size={13} /> {s.runtime} min
                </span>
                <span>
                  <Star size={13} /> {s.ratings.value}/10
                </span>
              </div>
              <div className="modal-genres">
                {s.genres.map((g) => (
                  <span key={g} className="sonarr-genre">
                    {g}
                  </span>
                ))}
              </div>
              {tags.length > 0 && (
                <div className="modal-tags">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="sonarr-tag"
                      style={{
                        borderColor: TAG_COLORS[t] ?? "#64748b",
                        color: TAG_COLORS[t] ?? "#94a3b8",
                      }}
                    >
                      <Tag size={11} /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-body">
          <p className="modal-overview">{s.overview}</p>
          <div className="modal-stats-grid">
            <div className="modal-stat">
              <span className="modal-stat-value">{s.statistics.seasonCount}</span>
              <span className="modal-stat-label">Seasons</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">
                {s.statistics.episodeFileCount}/{s.statistics.totalEpisodeCount}
              </span>
              <span className="modal-stat-label">Episodes</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">
                {s.statistics.percentOfEpisodes.toFixed(0)}%
              </span>
              <span className="modal-stat-label">Complete</span>
            </div>
            <div className="modal-stat">
              <span className="modal-stat-value">
                {formatSize(s.statistics.sizeOnDisk)}
              </span>
              <span className="modal-stat-label">Size</span>
            </div>
          </div>
          <h3 className="modal-section-title">Seasons</h3>
          <div className="modal-seasons">
            {s.seasons
              .filter((se) => se.seasonNumber > 0)
              .map((se) => (
                <div key={se.seasonNumber} className="modal-season-row">
                  <div className="modal-season-name">
                    <Play size={14} /> Season {se.seasonNumber}
                    {!se.monitored && (
                      <span className="modal-unmonitored">unmonitored</span>
                    )}
                  </div>
                  <div className="modal-season-bar-wrapper">
                    <div className="modal-season-bar">
                      <div
                        className="modal-season-bar-fill"
                        style={{ width: `${se.statistics.percentOfEpisodes}%` }}
                      />
                    </div>
                    <span className="modal-season-episodes">
                      {se.statistics.episodeFileCount}/{se.statistics.totalEpisodeCount}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <h3 className="modal-section-title">Details</h3>
          <div className="modal-details-grid">
            <div>
              <span>Path</span>
              <span>{s.path}</span>
            </div>
            <div>
              <span>Added</span>
              <span>{new Date(s.added).toLocaleDateString()}</span>
            </div>
            <div>
              <span>First Aired</span>
              <span>{new Date(s.firstAired).toLocaleDateString()}</span>
            </div>
            {s.previousAiring && (
              <div>
                <span>Last Aired</span>
                <span>{new Date(s.previousAiring).toLocaleDateString()}</span>
              </div>
            )}
            {s.imdbId && (
              <div>
                <span>IMDb</span>
                <a
                  href={`https://www.imdb.com/title/${s.imdbId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.imdbId} <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button
              className="sonarr-btn sonarr-btn-edit"
              onClick={() => {
                onClose();
                onEdit(s);
              }}
            >
              <Edit3 size={14} /> Edit
            </button>
            <button
              className="sonarr-btn sonarr-btn-delete"
              onClick={() => {
                onClose();
                onDelete(s.id);
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Sonarr = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "continuing" | "ended">(
    "all"
  );
  const [userFilter, setUserFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", path: "", overview: "" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadSeries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sonarr/series");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: Series[] = await response.json();
      setSeries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load series");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSeries();
  }, []);

  const users = useMemo(() => {
    const set = new Set(series.map((s) => getUser(s.rootFolderPath)));
    return Array.from(set).sort();
  }, [series]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    series.forEach((s) => getTagNames(s.tags).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [series]);

  const filtered = useMemo(() => {
    const result = series.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.network.toLowerCase().includes(q) ||
        s.genres.some((g) => g.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchUser = userFilter === "all" || getUser(s.rootFolderPath) === userFilter;
      const matchTag = tagFilter === "all" || getTagNames(s.tags).includes(tagFilter);
      return matchSearch && matchStatus && matchUser && matchTag;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "year":
          cmp = a.year - b.year;
          break;
        case "rating":
          cmp = a.ratings.value - b.ratings.value;
          break;
        case "size":
          cmp = a.statistics.sizeOnDisk - b.statistics.sizeOnDisk;
          break;
        case "added":
          cmp = new Date(a.added).getTime() - new Date(b.added).getTime();
          break;
        case "percent":
          cmp = a.statistics.percentOfEpisodes - b.statistics.percentOfEpisodes;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [series, search, statusFilter, userFilter, tagFilter, sortKey, sortDir]);

  const totalSize = useMemo(
    () => series.reduce((acc, s) => acc + s.statistics.sizeOnDisk, 0),
    [series]
  );
  const totalEpisodes = useMemo(
    () => series.reduce((acc, s) => acc + s.statistics.totalEpisodeCount, 0),
    [series]
  );
  const downloadedEpisodes = useMemo(
    () => series.reduce((acc, s) => acc + s.statistics.episodeFileCount, 0),
    [series]
  );
  const avgRating = useMemo(
    () =>
      series.length
        ? (series.reduce((acc, s) => acc + s.ratings.value, 0) / series.length).toFixed(1)
        : "0",
    [series]
  );

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this series?")) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/sonarr/series/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedSeries((prev) => (prev?.id === id ? null : prev));
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete series");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!window.confirm(`Delete ${selectedIds.size} selected series?`)) {
      return;
    }

    setError(null);

    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/api/sonarr/series/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        })
      );

      void results;
      setSelectedIds(new Set());
      setSelectedSeries((prev) => (prev && selectedIds.has(prev.id) ? null : prev));
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete series");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const startEdit = (s: Series) => {
    setEditingId(s.id);
    setEditForm({ title: s.title, path: s.path, overview: s.overview });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: number) => {
    setError(null);

    try {
      const response = await fetch(`/api/sonarr/series/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setEditingId(null);
      await loadSeries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update series");
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) {
    return (
      <div className="sonarr-page">
        <div className="sonarr-loading">Loading series...</div>
      </div>
    );
  }

  return (
    <div className="sonarr-page">
      {error && <div className="error-banner">Failed to load Sonarr data: {error}</div>}

      <header className="sonarr-header">
        <div>
          <h1 className="sonarr-title">
            <Tv size={28} /> Sonarr
          </h1>
          <p className="sonarr-subtitle">
            {filtered.length} of {series.length} series
          </p>
        </div>
        <div className="sonarr-view-toggle">
          <button
            className={`sonarr-view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`sonarr-view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <List size={16} />
          </button>
        </div>
      </header>

      <div className="sonarr-stats-row">
        <StatCard icon={Tv} label="Total Series" value={series.length} color="#8b5cf6" />
        <StatCard
          icon={Film}
          label="Episodes"
          value={`${downloadedEpisodes}/${totalEpisodes}`}
          color="#3b82f6"
        />
        <StatCard icon={Database} label="Total Size" value={formatSize(totalSize)} color="#f59e0b" />
        <StatCard icon={Star} label="Avg Rating" value={avgRating} color="#22c55e" />
        <StatCard
          icon={Server}
          label="Continuing"
          value={series.filter((s) => s.status === "continuing").length}
          color="#06b6d4"
        />
      </div>

      <div className="sonarr-toolbar">
        <div className="sonarr-search-wrapper">
          <Search size={16} className="sonarr-search-icon" />
          <input
            type="text"
            placeholder="Search by title, network, genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sonarr-search-input"
          />
        </div>
        <div className="sonarr-filters">
          <Filter size={15} />
          <div className="sonarr-filter-group">
            {(["all", "continuing", "ended"] as const).map((f) => (
              <button
                key={f}
                className={`sonarr-filter-btn ${statusFilter === f ? "active" : ""}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === "all" ? "All" : f === "continuing" ? "Continuing" : "Ended"}
              </button>
            ))}
          </div>
          <div className="sonarr-filter-group">
            <User size={15} />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="sonarr-select"
            >
              <option value="all">All users</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="sonarr-filter-group">
            <Tag size={15} />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="sonarr-select"
            >
              <option value="all">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="sonarr-sort-row">
        <span className="sonarr-sort-label">
          <ArrowUpDown size={14} /> Sort by:
        </span>
        {(
          [
            ["title", "Title"],
            ["year", "Year"],
            ["rating", "Rating"],
            ["size", "Size"],
            ["added", "Added"],
            ["percent", "Progress"],
          ] as [SortKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`sonarr-sort-btn ${sortKey === key ? "active" : ""}`}
            onClick={() => toggleSort(key)}
          >
            {label} {sortKey === key && (sortDir === "asc" ? "↑" : "↓")}
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="sonarr-batch-bar">
          <span>{selectedIds.size} selected</span>
          <button className="sonarr-btn sonarr-btn-delete" onClick={handleBatchDelete}>
            <Trash2 size={14} /> Delete selected
          </button>
          <button
            className="sonarr-btn sonarr-btn-cancel"
            onClick={() => setSelectedIds(new Set())}
          >
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {viewMode === "grid" && (
        <div className="sonarr-grid">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`sonarr-card ${selectedIds.has(s.id) ? "sonarr-card--selected" : ""}`}
            >
              {editingId === s.id ? (
                <div className="sonarr-card-edit">
                  <label>
                    <span>Title</span>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Path</span>
                    <input
                      value={editForm.path}
                      onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Overview</span>
                    <textarea
                      rows={3}
                      value={editForm.overview}
                      onChange={(e) => setEditForm({ ...editForm, overview: e.target.value })}
                    />
                  </label>
                  <div className="sonarr-edit-actions">
                    <button className="sonarr-btn sonarr-btn-save" onClick={() => saveEdit(s.id)}>
                      <Check size={14} /> Save
                    </button>
                    <button className="sonarr-btn sonarr-btn-cancel" onClick={cancelEdit}>
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sonarr-card-clickable" onClick={() => setSelectedSeries(s)}>
                  <div className="sonarr-card-poster">
                    {getPoster(s.images) ? (
                      <img src={getPoster(s.images)} alt={s.title} />
                    ) : (
                      <div className="sonarr-card-poster-placeholder">
                        <Tv size={40} />
                      </div>
                    )}
                    <span className={`sonarr-status-badge sonarr-status-${s.status}`}>
                      {s.status}
                    </span>
                    <span className="sonarr-user-badge">{getUser(s.rootFolderPath)}</span>
                    <button
                      className="sonarr-card-select"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(s.id);
                      }}
                    >
                      {selectedIds.has(s.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </div>
                  <div className="sonarr-card-body">
                    <h3 className="sonarr-card-title">
                      {s.title} <span>({s.year})</span>
                    </h3>
                    <div className="sonarr-card-meta">
                      <span>
                        <Calendar size={13} /> {s.network}
                      </span>
                      <span>
                        <Star size={13} /> {s.ratings.value}
                      </span>
                      <span>
                        <HardDrive size={13} /> {formatSize(s.statistics.sizeOnDisk)}
                      </span>
                    </div>
                    {s.tags.length > 0 && (
                      <div className="sonarr-card-tags">
                        {getTagNames(s.tags).map((t) => (
                          <span
                            key={t}
                            className="sonarr-tag"
                            style={{
                              borderColor: TAG_COLORS[t] ?? "#64748b",
                              color: TAG_COLORS[t] ?? "#94a3b8",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="sonarr-card-progress">
                      <div className="sonarr-progress-bar">
                        <div
                          className="sonarr-progress-fill"
                          style={{ width: `${s.statistics.percentOfEpisodes}%` }}
                        />
                      </div>
                      <span className="sonarr-progress-text">
                        {s.statistics.percentOfEpisodes.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="sonarr-card-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="sonarr-btn sonarr-btn-edit" onClick={() => startEdit(s)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="sonarr-btn sonarr-btn-delete" onClick={() => handleDelete(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="sonarr-list">
          <div className="sonarr-list-header">
            <div className="sonarr-list-check" onClick={toggleSelectAll}>
              {selectedIds.size === filtered.length && filtered.length > 0 ? (
                <CheckSquare size={16} />
              ) : (
                <Square size={16} />
              )}
            </div>
            <div className="sonarr-list-col sonarr-list-col--title">Title</div>
            <div className="sonarr-list-col sonarr-list-col--network">Network</div>
            <div className="sonarr-list-col sonarr-list-col--status">Status</div>
            <div className="sonarr-list-col sonarr-list-col--progress">Progress</div>
            <div className="sonarr-list-col sonarr-list-col--size">Size</div>
            <div className="sonarr-list-col sonarr-list-col--rating">Rating</div>
            <div className="sonarr-list-col sonarr-list-col--tags">Tags</div>
            <div className="sonarr-list-col sonarr-list-col--actions">Actions</div>
          </div>
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`sonarr-list-row ${selectedIds.has(s.id) ? "sonarr-list-row--selected" : ""}`}
              onClick={() => setSelectedSeries(s)}
            >
              <div
                className="sonarr-list-check"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(s.id);
                }}
              >
                {selectedIds.has(s.id) ? <CheckSquare size={16} /> : <Square size={16} />}
              </div>
              <div className="sonarr-list-col sonarr-list-col--title">
                <span className="sonarr-list-title">{s.title}</span>
                <span className="sonarr-list-year">{s.year}</span>
              </div>
              <div className="sonarr-list-col sonarr-list-col--network">{s.network}</div>
              <div className="sonarr-list-col sonarr-list-col--status">
                <span className={`sonarr-status-badge sonarr-status-${s.status}`}>
                  {s.status}
                </span>
              </div>
              <div className="sonarr-list-col sonarr-list-col--progress">
                <div className="sonarr-progress-bar sonarr-progress-bar--list">
                  <div
                    className="sonarr-progress-fill"
                    style={{ width: `${s.statistics.percentOfEpisodes}%` }}
                  />
                </div>
                <span>{s.statistics.percentOfEpisodes.toFixed(0)}%</span>
              </div>
              <div className="sonarr-list-col sonarr-list-col--size">
                {formatSize(s.statistics.sizeOnDisk)}
              </div>
              <div className="sonarr-list-col sonarr-list-col--rating">{s.ratings.value}</div>
              <div className="sonarr-list-col sonarr-list-col--tags">
                {getTagNames(s.tags).map((t) => (
                  <span
                    key={t}
                    className="sonarr-tag-sm"
                    style={{ color: TAG_COLORS[t] ?? "#94a3b8" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div
                className="sonarr-list-col sonarr-list-col--actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="sonarr-btn sonarr-btn-edit" onClick={() => startEdit(s)}>
                  <Edit3 size={13} />
                </button>
                <button className="sonarr-btn sonarr-btn-delete" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && <div className="sonarr-empty">No series match your filters.</div>}

      {selectedSeries && (
        <SeriesModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
          onDelete={handleDelete}
          onEdit={startEdit}
        />
      )}
    </div>
  );
};

export default Sonarr;
