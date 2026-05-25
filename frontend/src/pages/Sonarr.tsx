import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  Film,
  HardDrive,
  LayoutGrid,
  List,
  Loader2,
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

interface SonarrTag {
  id: number;
  label: string;
}

interface RootFolder {
  id: number;
  path: string;
  freeSpace: number;
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
type ReleaseSortKey = "title" | "quality" | "size" | "indexer" | "seeders" | "leechers" | "age" | "languages";

interface SonarrReleaseQuality {
  quality?: {
    id?: number;
    name?: string;
    source?: string;
    resolution?: number;
  };
}

interface SonarrReleaseEpisodeInfo {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  title: string;
}

interface SonarrRelease {
  guid: string;
  title: string;
  quality: SonarrReleaseQuality;
  age: number;
  size: number;
  indexerId: number;
  indexer: string;
  fullSeason: boolean;
  seasonNumber: number;
  languages: { id: number; name: string }[];
  approved: boolean;
  temporarilyRejected: boolean;
  rejected: boolean;
  rejections: string[];
  mappedEpisodeInfo?: SonarrReleaseEpisodeInfo[];
  seeders: number;
  leechers: number;
  protocol: string;
  downloadAllowed: boolean;
}

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

const getPathParts = (path: string) => path.split(/[\\/]+/).filter(Boolean);

const getLastPathPart = (path: string) => {
  const parts = getPathParts(path);
  return parts[parts.length - 1] ?? "";
};

const joinPath = (parentPath: string, childPath: string) => {
  const separator = parentPath.includes("\\") && !parentPath.includes("/") ? "\\" : "/";
  return `${parentPath.replace(/[\\/]+$/, "")}${separator}${childPath}`;
};

const getReleaseQualityName = (release: SonarrRelease) =>
  release.quality?.quality?.name ?? "";

const getReleaseLanguages = (release: SonarrRelease) =>
  release.languages?.map((language) => language.name).join(", ") ?? "";

const getReleaseEpisodeSummary = (release: SonarrRelease) => {
  if (release.fullSeason) {
    return `Season ${release.seasonNumber} full season`;
  }

  if (release.mappedEpisodeInfo?.length) {
    return release.mappedEpisodeInfo
      .map((episode) => `E${episode.episodeNumber} ${episode.title}`)
      .join(", ");
  }

  return release.seasonNumber > 0 ? `Season ${release.seasonNumber}` : "";
};



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
  onInteractiveSearch,
  tagMap,
}: {
  series: Series;
  onClose: () => void;
  onDelete: (id: number) => void;
  onEdit: (s: Series) => void;
  onInteractiveSearch: (s: Series) => void;
  tagMap: Record<number, string>;
}) {
  const fanart = getFanart(s.images);
  const poster = getPoster(s.images);
  const user = getUser(s.rootFolderPath);
  const tags = s.tags.map((t) => tagMap[t] ?? `tag-${t}`);

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
              className="sonarr-btn sonarr-btn-search"
              onClick={() => {
                onClose();
                onInteractiveSearch(s);
              }}
            >
              <Search size={14} /> Search Releases
            </button>
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

function ReleaseSearchModal({
  series,
  selectedSeasonNumber,
  onSeasonChange,
  releases,
  loading,
  onClose,
  onGrab,
  grabbingGuid,
}: {
  series: Series;
  selectedSeasonNumber: number;
  onSeasonChange: (seasonNumber: number) => void;
  releases: SonarrRelease[];
  loading: boolean;
  onClose: () => void;
  onGrab: (release: SonarrRelease) => void;
  grabbingGuid: string | null;
}) {
  const [releaseSortKey, setReleaseSortKey] = useState<ReleaseSortKey>("age");
  const [releaseSortDir, setReleaseSortDir] = useState<SortDir>("asc");

  const searchableSeasons = useMemo(
    () => series.seasons.filter((season) => season.seasonNumber > 0),
    [series.seasons]
  );

  const sortedReleases = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    const result = [...releases];

    result.sort((left, right) => {
      let comparison = 0;

      switch (releaseSortKey) {
        case "title":
          comparison = collator.compare(left.title, right.title);
          break;
        case "quality":
          comparison = collator.compare(getReleaseQualityName(left), getReleaseQualityName(right));
          break;
        case "size":
          comparison = left.size - right.size;
          break;
        case "indexer":
          comparison = collator.compare(left.indexer, right.indexer);
          break;
        case "seeders":
          comparison = left.seeders - right.seeders;
          break;
        case "leechers":
          comparison = left.leechers - right.leechers;
          break;
        case "age":
          comparison = left.age - right.age;
          break;
        case "languages":
          comparison = collator.compare(getReleaseLanguages(left), getReleaseLanguages(right));
          break;
      }

      if (comparison === 0) {
        comparison = collator.compare(left.title, right.title);
      }

      return releaseSortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [releaseSortDir, releaseSortKey, releases]);

  const toggleReleaseSort = (key: ReleaseSortKey) => {
    if (releaseSortKey === key) {
      setReleaseSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setReleaseSortKey(key);
    setReleaseSortDir(key === "age" ? "asc" : "desc");
  };

  const renderSortLabel = (key: ReleaseSortKey, label: string) => (
    <>
      <span>{label}</span>
      <span className={`sonarr-release-sort-indicator ${releaseSortKey === key ? "is-active" : ""}`}>
        {releaseSortKey === key ? (releaseSortDir === "asc" ? "↑" : "↓") : <ArrowUpDown size={12} />}
      </span>
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sonarr-release-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sonarr-release-header">
          <div>
            <h2>
              <Search size={18} /> Interactive Search - {series.title}
            </h2>
            <p>Choose a season, review releases, then grab the one you want.</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sonarr-release-body">
          <div className="sonarr-release-toolbar">
            <label className="sonarr-release-season-picker">
              <span>Season</span>
              <select
                value={selectedSeasonNumber}
                onChange={(event) => onSeasonChange(Number(event.target.value))}
              >
                {searchableSeasons.map((season) => (
                  <option key={season.seasonNumber} value={season.seasonNumber}>
                    Season {season.seasonNumber}
                  </option>
                ))}
              </select>
            </label>
            <div className="sonarr-release-summary">
              <span>{sortedReleases.length} releases</span>
              <span>
                Sorted by {releaseSortKey} {releaseSortDir === "asc" ? "ascending" : "descending"}
              </span>
            </div>
          </div>

          {searchableSeasons.length === 0 ? (
            <div className="sonarr-release-empty">No searchable seasons found for this series.</div>
          ) : loading ? (
            <div className="sonarr-release-loading">
              <Loader2 size={24} className="sonarr-spin" /> Searching releases...
            </div>
          ) : releases.length === 0 ? (
            <div className="sonarr-release-empty">No releases found for the selected season.</div>
          ) : (
            <div className="sonarr-release-table-wrapper">
              <table className="sonarr-release-table">
                <thead>
                  <tr>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("title")}>
                        {renderSortLabel("title", "Title")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("quality")}>
                        {renderSortLabel("quality", "Quality")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("size")}>
                        {renderSortLabel("size", "Size")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("indexer")}>
                        {renderSortLabel("indexer", "Indexer")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("seeders")}>
                        {renderSortLabel("seeders", "Seeds")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("leechers")}>
                        {renderSortLabel("leechers", "Peers")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("age")}>
                        {renderSortLabel("age", "Age")}
                      </button>
                    </th>
                    <th>
                      <button className="sonarr-release-sort-button" onClick={() => toggleReleaseSort("languages")}>
                        {renderSortLabel("languages", "Lang")}
                      </button>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReleases.map((release) => (
                    <tr
                      key={release.guid}
                      className={release.rejected || release.temporarilyRejected ? "sonarr-release-rejected" : "sonarr-release-approved"}
                    >
                      <td className="sonarr-release-title-cell" title={release.title}>
                        <div className="sonarr-release-title">{release.title}</div>
                        <div className="sonarr-release-meta">{getReleaseEpisodeSummary(release)}</div>
                        {(release.rejected || release.temporarilyRejected) && release.rejections?.length > 0 && (
                          <div className="sonarr-release-rejections">
                            {release.rejections.map((rejection, index) => (
                              <span key={`${release.guid}-${index}`}>{rejection}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>{getReleaseQualityName(release) || "-"}</td>
                      <td>{formatSize(release.size)}</td>
                      <td>{release.indexer}</td>
                      <td>{release.protocol === "torrent" ? release.seeders : "-"}</td>
                      <td>{release.protocol === "torrent" ? release.leechers : "-"}</td>
                      <td>{release.age}d</td>
                      <td>{getReleaseLanguages(release) || "-"}</td>
                      <td>
                        <button
                          className="sonarr-btn sonarr-btn-grab"
                          disabled={grabbingGuid === release.guid || !release.downloadAllowed}
                          onClick={() => onGrab(release)}
                          title={release.downloadAllowed ? "Grab release" : "Download not allowed"}
                        >
                          {grabbingGuid === release.guid ? (
                            <Loader2 size={14} className="sonarr-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Sonarr = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [tags, setTags] = useState<SonarrTag[]>([]);
  const [rootFolders, setRootFolders] = useState<RootFolder[]>([]);
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
  const [editForm, setEditForm] = useState({ path: "", tags: [] as number[] });
  const [moveFiles, setMoveFiles] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [releaseSearchSeries, setReleaseSearchSeries] = useState<Series | null>(null);
  const [releaseSeasonNumber, setReleaseSeasonNumber] = useState<number>(1);
  const [releases, setReleases] = useState<SonarrRelease[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [grabbingGuid, setGrabbingGuid] = useState<string | null>(null);

  const tagMap = useMemo(() => {
    const map: Record<number, string> = {};
    tags.forEach((t) => { map[t.id] = t.label; });
    return map;
  }, [tags]);

  const getTagNames = (tagIds: number[]) =>
    tagIds.map((t) => tagMap[t] ?? `tag-${t}`);

  const loadSeries = async () => {
    setLoading(true);
    setError(null);

    try {
      const [seriesRes, tagsRes, rootFoldersRes] = await Promise.all([
        fetch("/api/sonarr/series"),
        fetch("/api/sonarr/tags"),
        fetch("/api/sonarr/rootFolders"),
      ]);

      if (!seriesRes.ok) throw new Error(`HTTP ${seriesRes.status}`);
      if (!tagsRes.ok) throw new Error(`Tags: HTTP ${tagsRes.status}`);
      if (!rootFoldersRes.ok) throw new Error(`Root folders: HTTP ${rootFoldersRes.status}`);

      const [seriesData, tagsData, rootFoldersData] = await Promise.all([
        seriesRes.json() as Promise<Series[]>,
        tagsRes.json() as Promise<SonarrTag[]>,
        rootFoldersRes.json() as Promise<RootFolder[]>,
      ]);

      setSeries(seriesData);
      setTags(tagsData);
      setRootFolders(rootFoldersData);
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
    setEditForm({ path: s.rootFolderPath, tags: [...s.tags] });
    setMoveFiles(false);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (s: Series) => {
    setError(null);

    try {
      const folderName = getLastPathPart(s.path);

      if (!folderName) {
        throw new Error("Failed to determine series folder name");
      }

      const payload = {
        ...editForm,
        path: joinPath(editForm.path, folderName),
        rootFolderPath: editForm.path,
      };
      const url = moveFiles
        ? `/api/sonarr/series/${s.id}?moveFiles=true`
        : `/api/sonarr/series/${s.id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

  const getSearchableSeasons = (seriesItem: Series) =>
    seriesItem.seasons.filter((season) => season.seasonNumber > 0);

  const getInitialSeasonNumber = (seriesItem: Series) => {
    const searchableSeasons = getSearchableSeasons(seriesItem);
    return searchableSeasons.find((season) => season.monitored)?.seasonNumber
      ?? searchableSeasons[0]?.seasonNumber
      ?? 1;
  };

  const loadReleases = async (seriesId: number, seasonNumber: number) => {
    setReleasesLoading(true);

    try {
      const response = await fetch(
        `/api/sonarr/release?seriesId=${seriesId}&seasonNumber=${seasonNumber}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as SonarrRelease[];
      setReleases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search releases");
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  };

  const openReleaseSearch = async (seriesItem: Series) => {
    const initialSeasonNumber = getInitialSeasonNumber(seriesItem);
    setError(null);
    setReleaseSearchSeries(seriesItem);
    setReleaseSeasonNumber(initialSeasonNumber);
    setReleases([]);

    if (getSearchableSeasons(seriesItem).length === 0) {
      return;
    }

    await loadReleases(seriesItem.id, initialSeasonNumber);
  };

  const closeReleaseSearch = () => {
    setReleaseSearchSeries(null);
    setReleases([]);
    setReleasesLoading(false);
    setGrabbingGuid(null);
  };

  const handleSeasonChange = async (seasonNumber: number) => {
    if (!releaseSearchSeries) {
      return;
    }

    setReleaseSeasonNumber(seasonNumber);
    await loadReleases(releaseSearchSeries.id, seasonNumber);
  };

  const handleGrabRelease = async (release: SonarrRelease) => {
    setGrabbingGuid(release.guid);

    try {
      const response = await fetch("/api/sonarr/release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(release),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setReleases((current) => current.filter((item) => item.guid !== release.guid));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grab release");
    } finally {
      setGrabbingGuid(null);
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
                    <span>Path</span>
                    <select
                      value={editForm.path}
                      onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
                    >
                      {rootFolders.map((rf) => (
                        <option key={rf.id} value={rf.path}>
                          {rf.path}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tags</span>
                    <select
                      value={editForm.tags[0]?.toString() ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          tags: e.target.value ? [Number(e.target.value)] : [],
                        })
                      }
                    >
                      <option value="">No tag</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="sonarr-edit-move-files">
                    <input
                      type="checkbox"
                      checked={moveFiles}
                      onChange={(e) => setMoveFiles(e.target.checked)}
                    />
                    <span>Move files to new path</span>
                  </label>
                  <div className="sonarr-edit-actions">
                    <button className="sonarr-btn sonarr-btn-save" onClick={() => saveEdit(s)}>
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
                      <button className="sonarr-btn sonarr-btn-search" onClick={() => void openReleaseSearch(s)}>
                        <Search size={14} />
                      </button>
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
                <button className="sonarr-btn sonarr-btn-search" onClick={() => void openReleaseSearch(s)}>
                  <Search size={13} />
                </button>
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
          onInteractiveSearch={(seriesItem) => {
            void openReleaseSearch(seriesItem);
          }}
          tagMap={tagMap}
        />
      )}

      {releaseSearchSeries && (
        <ReleaseSearchModal
          series={releaseSearchSeries}
          selectedSeasonNumber={releaseSeasonNumber}
          onSeasonChange={(seasonNumber) => {
            void handleSeasonChange(seasonNumber);
          }}
          releases={releases}
          loading={releasesLoading}
          onClose={closeReleaseSearch}
          onGrab={(release) => {
            void handleGrabRelease(release);
          }}
          grabbingGuid={grabbingGuid}
        />
      )}
    </div>
  );
};

export default Sonarr;
