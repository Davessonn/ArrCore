import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check,
  Clock,
  Film,
  Search,
  Send,
  Tv,
  User,
  Users,
  X,
} from "lucide-react";
import "./Seerr.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SeerrUser {
  id: number;
  displayName: string;
  avatar?: string;
  requestCount: number;
}

interface MediaInfo {
  id: number;
  status: number; // 1=unknown, 2=pending, 3=processing, 4=partially available, 5=available
}

interface SeerrMedia {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  mediaType: "movie" | "tv";
  status: number;
  posterPath?: string;
  title?: string;
  name?: string;
  externalServiceSlug?: string;
}

interface SearchResult {
  id: number;
  mediaType: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  firstAirDate?: string;
  mediaInfo?: MediaInfo;
}

interface SearchResponse {
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchResult[];
}

interface SeerrRequest {
  id: number;
  status: number; // 1=pending, 2=approved, 3=declined
  type: "movie" | "tv";
  createdAt: string;
  media: SeerrMedia;
  requestedBy: SeerrUser;
  seasons?: { seasonNumber: number }[];
}

interface RequestsResponse {
  pageInfo: { pages: number; pageSize: number; results: number; page: number };
  results: SeerrRequest[];
}

interface TvDetails {
  id: number;
  name: string;
  posterPath?: string;
  numberOfSeasons: number;
  seasons: { seasonNumber: number; episodeCount: number; name: string }[];
}

interface MovieDetails {
  id: number;
  title?: string;
  posterPath?: string;
}

interface ServiceProfile { id: number; name: string; }
interface ServiceRootFolder { id: number; freeSpace: number; path: string; }
interface ServiceTag { id: number; label: string; }
interface ServiceInfo {
  server: { id: number; name: string; activeProfileId: number; activeDirectory: string; activeTags: number[] };
  profiles: ServiceProfile[];
  rootFolders: ServiceRootFolder[];
  tags: ServiceTag[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

function getStatusLabel(status: number): { label: string; cls: string } {
  switch (status) {
    case 1: return { label: "Pending", cls: "pending" };
    case 2: return { label: "Approved", cls: "approved" };
    case 3: return { label: "Declined", cls: "declined" };
    case 4: return { label: "Available", cls: "available" };
    case 5: return { label: "Available", cls: "available" };
    default: return { label: "Unknown", cls: "pending" };
  }
}

function getMediaStatusLabel(status?: number): { label: string; cls: string } | null {
  if (!status) return null;
  switch (status) {
    case 2: return { label: "Pending", cls: "pending" };
    case 3: return { label: "Processing", cls: "processing" };
    case 4: return { label: "Available", cls: "available" };
    case 5: return { label: "Available", cls: "available" };
    default: return null;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function slugToTitle(slug?: string): string | undefined {
  if (!slug) return undefined;
  if (/^\d+$/.test(slug)) return undefined;
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

function normalizeRequest(raw: any): SeerrRequest {
  const media = raw.media ?? {};
  const fallbackTitle = media.title ?? media.name ?? slugToTitle(media.externalServiceSlug);

  return {
    id: raw.id,
    status: raw.status,
    type: raw.type,
    createdAt: raw.createdAt,
    media: {
      id: media.id,
      tmdbId: media.tmdbId,
      tvdbId: media.tvdbId,
      mediaType: media.mediaType ?? raw.type,
      status: media.status,
      posterPath: media.posterPath,
      title: fallbackTitle,
      name: media.name,
      externalServiceSlug: media.externalServiceSlug,
    },
    requestedBy: {
      id: raw.requestedBy?.id,
      displayName: raw.requestedBy?.displayName ?? raw.requestedBy?.username ?? raw.requestedBy?.email ?? `User ${raw.requestedBy?.id ?? "?"}`,
      avatar: raw.requestedBy?.avatar,
      requestCount: raw.requestedBy?.requestCount ?? 0,
    },
    seasons: raw.seasons ?? [],
  };
}

async function enrichRequestMedia(req: SeerrRequest): Promise<SeerrRequest> {
  if ((req.media.title && req.media.posterPath) || !req.media.tmdbId) return req;

  const endpoint = req.type === "tv" ? `/api/seerr/tv/${req.media.tmdbId}` : `/api/seerr/movie/${req.media.tmdbId}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return req;

    const details: TvDetails | MovieDetails = await res.json();
    const resolvedTitle = req.type === "tv"
      ? (details as TvDetails).name
      : (details as MovieDetails).title;

    return {
      ...req,
      media: {
        ...req.media,
        title: req.media.title ?? resolvedTitle ?? req.media.name,
        posterPath: req.media.posterPath ?? details.posterPath,
      },
    };
  } catch {
    if (req.type !== "movie") return req;

    try {
      const searchRes = await fetch(`/api/seerr/search?query=${encodeURIComponent(String(req.media.tmdbId))}&page=1&language=en`);
      if (!searchRes.ok) return req;

      const searchData: SearchResponse = await searchRes.json();
      const match = (searchData.results ?? []).find(
        (item) => item.mediaType === "movie" && item.id === req.media.tmdbId
      );

      if (!match) return req;

      return {
        ...req,
        media: {
          ...req.media,
          title: req.media.title ?? match.title ?? match.name,
          posterPath: req.media.posterPath ?? match.posterPath,
        },
      };
    } catch {
      return req;
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Seerr() {
  const [activeTab, setActiveTab] = useState<"requests" | "search">("requests");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users & Requests
  const [users, setUsers] = useState<SeerrUser[]>([]);
  const [requests, setRequests] = useState<SeerrRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Request filter
  const [requestSearch, setRequestSearch] = useState("");

  // Request modal
  const [modalItem, setModalItem] = useState<SearchResult | null>(null);
  const [tvDetails, setTvDetails] = useState<TvDetails | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [requestUserId, setRequestUserId] = useState<number | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedRootFolder, setSelectedRootFolder] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/seerr/user");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      const userList: SeerrUser[] = (data.results ?? data).map((u: any) => ({
        id: u.id,
        displayName: u.displayName ?? u.username ?? u.email ?? `User ${u.id}`,
        avatar: u.avatar,
        requestCount: u.requestCount ?? 0,
      }));
      setUsers(userList);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ take: "100", skip: "0", sort: "added" });
      if (selectedUser !== null) params.set("requestedBy", String(selectedUser));
      const res = await fetch(`/api/seerr/request?${params}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data: RequestsResponse = await res.json();
      const normalized = (data.results ?? []).map((request: any) => normalizeRequest(request));
      const enriched = await Promise.all(normalized.map((request) => enrichRequestMedia(request)));
      setRequests(enriched);
    } catch (e: any) {
      setError(e.message);
    }
  }, [selectedUser]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchRequests()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchRequests]);

  // ─── Search ──────────────────────────────────────────────────────────────

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/seerr/search?query=${encodeURIComponent(searchQuery.trim())}&page=1&language=en`);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setSearchResults(data.results ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  // ─── Request Modal ───────────────────────────────────────────────────────

  const openRequestModal = async (item: SearchResult) => {
    if (item.mediaType === "person") return;
    setModalItem(item);
    setSelectedSeasons([]);
    setTvDetails(null);
    setServiceInfo(null);
    setSelectedProfileId(null);
    setSelectedRootFolder("");
    setSelectedTagIds([]);
    setRequestUserId(
      selectedUser !== null && users.some((u) => u.id === selectedUser)
        ? selectedUser
        : (users[0]?.id ?? null)
    );

    const fetchTv = item.mediaType === "tv"
      ? fetch(`/api/seerr/tv/${item.id}`).then(async (res) => {
          if (!res.ok) return;
          const details: TvDetails = await res.json();
          setTvDetails(details);
          setSelectedSeasons(details.seasons.filter((s) => s.seasonNumber > 0).map((s) => s.seasonNumber));
        }).catch(() => {})
      : Promise.resolve();

    const serviceEndpoint = item.mediaType === "tv"
      ? "/api/seerr/service/sonarr/default"
      : "/api/seerr/service/radarr/default";
    const fetchService = fetch(serviceEndpoint).then(async (res) => {
      if (!res.ok) return;
      const svcData: ServiceInfo = await res.json();
      setServiceInfo(svcData);
      const hdProfile = svcData.profiles.find((p) => p.name === "HD - 720p/1080p");
      setSelectedProfileId(hdProfile?.id ?? svcData.server.activeProfileId ?? svcData.profiles[0]?.id ?? null);
      setSelectedRootFolder(svcData.server.activeDirectory ?? svcData.rootFolders[0]?.path ?? "");
      setSelectedTagIds([]);
    }).catch(() => {});

    await Promise.all([fetchTv, fetchService]);
  };

  const submitRequest = async () => {
    if (!modalItem) return;
    setRequesting(true);
    setError(null);
    try {
      const body: any = {
        mediaType: modalItem.mediaType,
        mediaId: modalItem.id,
      };
      if (modalItem.mediaType === "tv" && selectedSeasons.length > 0) {
        body.seasons = selectedSeasons;
      }
      if (requestUserId !== null) {
        body.userId = requestUserId;
      }
      if (serviceInfo) {
        body.serverId = serviceInfo.server.id;
        if (selectedProfileId !== null) body.profileId = selectedProfileId;
        if (selectedRootFolder) body.rootFolder = selectedRootFolder;
        if (selectedTagIds.length > 0) body.tags = selectedTagIds;
      }
      const res = await fetch("/api/seerr/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message ?? "Request failed");
      }
      // Refresh requests and search results
      setModalItem(null);
      fetchRequests();
      if (searchQuery.trim()) doSearch();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRequesting(false);
    }
  };

  // ─── Stats ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 1).length;
    const approved = requests.filter((r) => r.status === 2).length;
    const available = requests.filter((r) => r.media?.status === 5 || r.media?.status === 4).length;
    return { total: requests.length, pending, approved, available };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (!requestSearch.trim()) return requests;
    const q = requestSearch.toLowerCase();
    return requests.filter((r) => {
      const title = (r.media?.title ?? "").toLowerCase();
      const user = (r.requestedBy?.displayName ?? "").toLowerCase();
      return title.includes(q) || user.includes(q);
    });
  }, [requests, requestSearch]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="seerr-page"><div className="seerr-loading">Loading Seerr data...</div></div>;
  }

  return (
    <div className="seerr-page">
      <div className="seerr-header">
        <div>
          <h1 className="seerr-title"><Film size={28} /> Seerr</h1>
          <p className="seerr-subtitle">Requests &amp; Media Search</p>
        </div>
      </div>

      {error && <div className="seerr-error">{error}</div>}

      {/* Stats */}
      <div className="seerr-stats-row">
        <div className="seerr-stat-card">
          <div className="seerr-stat-icon" style={{ background: "rgba(99,102,241,0.12)" }}>
            <Send size={20} style={{ color: "#818cf8" }} />
          </div>
          <div className="seerr-stat-info">
            <span className="seerr-stat-value">{stats.total}</span>
            <span className="seerr-stat-label">Total Requests</span>
          </div>
        </div>
        <div className="seerr-stat-card">
          <div className="seerr-stat-icon" style={{ background: "rgba(245,158,11,0.12)" }}>
            <Clock size={20} style={{ color: "#fbbf24" }} />
          </div>
          <div className="seerr-stat-info">
            <span className="seerr-stat-value">{stats.pending}</span>
            <span className="seerr-stat-label">Pending</span>
          </div>
        </div>
        <div className="seerr-stat-card">
          <div className="seerr-stat-icon" style={{ background: "rgba(59,130,246,0.12)" }}>
            <Check size={20} style={{ color: "#60a5fa" }} />
          </div>
          <div className="seerr-stat-info">
            <span className="seerr-stat-value">{stats.approved}</span>
            <span className="seerr-stat-label">Approved</span>
          </div>
        </div>
        <div className="seerr-stat-card">
          <div className="seerr-stat-icon" style={{ background: "rgba(34,197,94,0.12)" }}>
            <Check size={20} style={{ color: "#4ade80" }} />
          </div>
          <div className="seerr-stat-info">
            <span className="seerr-stat-value">{stats.available}</span>
            <span className="seerr-stat-label">Available</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="seerr-tabs">
        <button className={`seerr-tab ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>
          <Users size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Requests
        </button>
        <button className={`seerr-tab ${activeTab === "search" ? "active" : ""}`} onClick={() => setActiveTab("search")}>
          <Search size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Search &amp; Request
        </button>
      </div>

      {/* ─── Requests Tab ───────────────────────────────────────────────────── */}
      {activeTab === "requests" && (
        <div className="seerr-requests-section">
          {/* Search filter */}
          <div className="seerr-request-search-bar">
            <div className="seerr-search-wrapper">
              <Search size={16} className="seerr-search-icon" />
              <input
                type="text"
                className="seerr-search-input"
                placeholder="Search requests by title or user..."
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
              />
            </div>
          </div>

          {/* User filter */}
          <div className="seerr-user-filter">
            <span className="seerr-user-filter-label"><User size={14} /> Filter by user:</span>
            <button
              className={`seerr-user-btn ${selectedUser === null ? "active" : ""}`}
              onClick={() => setSelectedUser(null)}
            >
              All
            </button>
            {users.map((u) => (
              <button
                key={u.id}
                className={`seerr-user-btn ${selectedUser === u.id ? "active" : ""}`}
                onClick={() => setSelectedUser(u.id)}
              >
                {u.avatar && <img src={u.avatar} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} />}
                {u.displayName} ({u.requestCount})
              </button>
            ))}
          </div>

          {/* Requests table */}
          {filteredRequests.length === 0 ? (
            <div className="seerr-empty">No requests found.</div>
          ) : (
            <table className="seerr-requests-table">
              <thead>
                <tr>
                  <th>Media</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const st = getStatusLabel(req.status);
                  return (
                    <tr key={req.id}>
                      <td>
                        <div className="seerr-req-media">
                          {req.media?.posterPath ? (
                            <img src={`${TMDB_IMG}${req.media.posterPath}`} alt="" className="seerr-req-thumb" />
                          ) : (
                            <div className="seerr-req-thumb" />
                          )}
                          <span className="seerr-req-title">
                            {req.media?.title ?? `TMDB #${req.media?.tmdbId ?? "?"}`}
                          </span>
                        </div>
                      </td>
                      <td><span className="seerr-req-type">{req.type}</span></td>
                      <td>
                        <span className={`seerr-req-status seerr-req-status-${st.cls}`}>{st.label}</span>
                      </td>
                      <td>
                        <div className="seerr-req-user">
                          {req.requestedBy?.avatar && (
                            <img src={req.requestedBy.avatar} alt="" className="seerr-req-avatar" />
                          )}
                          <span className="seerr-req-username">{req.requestedBy?.displayName ?? "Unknown"}</span>
                        </div>
                      </td>
                      <td>{formatDate(req.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Search Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "search" && (
        <div className="seerr-search-section">
          <div className="seerr-search-bar">
            <div className="seerr-search-wrapper">
              <Search size={16} className="seerr-search-icon" />
              <input
                type="text"
                className="seerr-search-input"
                placeholder="Search movies or TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <button className="seerr-search-btn" onClick={doSearch} disabled={searching || !searchQuery.trim()}>
              <Search size={15} />
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="seerr-results-grid">
              {searchResults
                .filter((r) => r.mediaType !== "person")
                .map((item) => {
                  const title = item.title ?? item.name ?? "Unknown";
                  const year = (item.releaseDate ?? item.firstAirDate ?? "").slice(0, 4);
                  const mediaStatus = getMediaStatusLabel(item.mediaInfo?.status);
                  const isAvailable = item.mediaInfo?.status === 4 || item.mediaInfo?.status === 5;

                  return (
                    <div key={`${item.mediaType}-${item.id}`} className="seerr-result-card" onClick={() => openRequestModal(item)}>
                      <div className="seerr-result-poster">
                        {item.posterPath ? (
                          <img src={`${TMDB_IMG}${item.posterPath}`} alt={title} />
                        ) : (
                          <div className="seerr-result-poster-placeholder">
                            {item.mediaType === "tv" ? <Tv size={40} /> : <Film size={40} />}
                          </div>
                        )}
                        <span className={`seerr-result-type-badge seerr-type-${item.mediaType}`}>
                          {item.mediaType === "tv" ? "TV" : "Movie"}
                        </span>
                        {mediaStatus && (
                          <span className={`seerr-result-status-badge seerr-status-${mediaStatus.cls}`}>
                            {mediaStatus.label}
                          </span>
                        )}
                      </div>
                      <div className="seerr-result-body">
                        <h4 className="seerr-result-title">{title}</h4>
                        {year && <p className="seerr-result-year">{year}</p>}
                        {item.overview && <p className="seerr-result-overview">{item.overview}</p>}
                        {!isAvailable && (
                          <button
                            className="seerr-request-btn"
                            onClick={(e) => { e.stopPropagation(); openRequestModal(item); }}
                          >
                            <Send size={13} /> Request
                          </button>
                        )}
                        {isAvailable && (
                          <button className="seerr-request-btn requested" disabled>
                            <Check size={13} /> Available
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {searchResults.length === 0 && !searching && searchQuery && (
            <div className="seerr-empty">No results found. Try a different search term.</div>
          )}
        </div>
      )}

      {/* ─── Request Modal ──────────────────────────────────────────────────── */}
      {modalItem && (
        <div className="seerr-modal-overlay" onClick={() => setModalItem(null)}>
          <div className="seerr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seerr-modal-header">
              <h3>Request {modalItem.mediaType === "tv" ? "TV Show" : "Movie"}</h3>
              <button className="seerr-modal-close" onClick={() => setModalItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="seerr-modal-body">
              {modalItem.posterPath && (
                <img src={`${TMDB_IMG}${modalItem.posterPath}`} alt="" className="seerr-modal-poster" />
              )}
              <h4 className="seerr-modal-title">{modalItem.title ?? modalItem.name}</h4>
              <p className="seerr-modal-year">
                {(modalItem.releaseDate ?? modalItem.firstAirDate ?? "").slice(0, 4)}
              </p>
              {modalItem.overview && (
                <p className="seerr-modal-overview">{modalItem.overview}</p>
              )}

              <div className="seerr-modal-field">
                <label className="seerr-modal-field-label" htmlFor="seerr-request-user">Requested by</label>
                <select
                  id="seerr-request-user"
                  className="seerr-modal-select"
                  value={requestUserId ?? ""}
                  onChange={(e) => setRequestUserId(e.target.value ? Number(e.target.value) : null)}
                >
                  {users.length === 0 && <option value="">No users available</option>}
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quality Profile */}
              {serviceInfo && (
                <div className="seerr-modal-field">
                  <label className="seerr-modal-field-label" htmlFor="seerr-request-profile">Quality Profile</label>
                  <select
                    id="seerr-request-profile"
                    className="seerr-modal-select"
                    value={selectedProfileId ?? ""}
                    onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                  >
                    {serviceInfo.profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Root Folder */}
              {serviceInfo && serviceInfo.rootFolders.length > 0 && (
                <div className="seerr-modal-field">
                  <label className="seerr-modal-field-label" htmlFor="seerr-request-rootfolder">Root Folder</label>
                  <select
                    id="seerr-request-rootfolder"
                    className="seerr-modal-select"
                    value={selectedRootFolder}
                    onChange={(e) => setSelectedRootFolder(e.target.value)}
                  >
                    {serviceInfo.rootFolders.map((f) => (
                      <option key={f.id} value={f.path}>{f.path} ({formatBytes(f.freeSpace)})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tags */}
              {serviceInfo && serviceInfo.tags.length > 0 && (
                <div className="seerr-modal-field">
                  <label className="seerr-modal-field-label">Tags</label>
                  <div className="seerr-tags-list">
                    {serviceInfo.tags.map((tag) => (
                      <label key={tag.id} className="seerr-tag-item">
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagIds((prev) => [...prev, tag.id]);
                            } else {
                              setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
                            }
                          }}
                        />
                        {tag.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Season selection for TV */}
              {modalItem.mediaType === "tv" && tvDetails && (
                <div className="seerr-seasons-list">
                  <div className="seerr-seasons-title">Select Seasons</div>
                  {tvDetails.seasons
                    .filter((s) => s.seasonNumber > 0)
                    .map((s) => (
                      <div key={s.seasonNumber} className="seerr-season-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedSeasons.includes(s.seasonNumber)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSeasons((prev) => [...prev, s.seasonNumber]);
                              } else {
                                setSelectedSeasons((prev) => prev.filter((n) => n !== s.seasonNumber));
                              }
                            }}
                          />
                          {s.name ?? `Season ${s.seasonNumber}`} ({s.episodeCount} episodes)
                        </label>
                      </div>
                    ))}
                </div>
              )}

              <div className="seerr-modal-actions">
                <button className="seerr-modal-cancel-btn" onClick={() => setModalItem(null)}>
                  Cancel
                </button>
                <button
                  className="seerr-modal-request-btn"
                  onClick={submitRequest}
                  disabled={requesting || users.length === 0 || (modalItem.mediaType === "tv" && selectedSeasons.length === 0)}
                >
                  <Send size={15} />
                  {requesting ? "Requesting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
