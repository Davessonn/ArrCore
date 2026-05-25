import { useEffect, useMemo, useState } from "react";
import {
	ArrowUpDown,
	Calendar,
	Check,
	CheckSquare,
	Download,
	Edit3,
	ExternalLink,
	Filter,
	Film,
	LayoutGrid,
	List,
	Loader2,
	Search,
	Square,
	Star,
	Tag,
	Trash2,
	Tv,
	User,
	X,
	Clock,
} from "lucide-react";
import "./Radarr.css";

interface RadarrImage {
	coverType: string;
	remoteUrl?: string;
	url?: string;
}

interface MovieRating {
	votes: number;
	value: number;
	type: string;
}

interface MovieRatings {
	imdb?: MovieRating;
	tmdb?: MovieRating;
	trakt?: MovieRating;
}

interface RadarrMovie {
	tmdbId: number;
	imdbId?: string;
	title: string;
	status: string;
	overview: string;
	runtime: number;
	year: number;
	ratings: MovieRatings;
	genres: string[];
	images: RadarrImage[];
	folder?: string;
	isExisting?: boolean;
	isExcluded?: boolean;
}

interface RadarrCollection {
	id?: number;
	title: string;
	sortTitle: string;
	tmdbId: number;
	images: RadarrImage[];
	overview: string;
	monitored: boolean;
	rootFolderPath: string;
	folder?: string;
	qualityProfileId: number;
	searchOnAdd: boolean;
	minimumAvailability: string;
	movies: RadarrMovie[];
	tags: number[];
	path: string;
}

interface RadarrTag {
	id: number;
	label: string;
}

interface RootFolder {
	id: number;
	path: string;
	freeSpace: number;
}

interface RadarrApiItem extends Omit<RadarrCollection, "movies" | "images" | "tags"> {
	id?: number;
	images?: RadarrImage[];
	tags?: number[];
	movies: RadarrMovie[] | null;
	status?: string;
	runtime?: number;
	year?: number;
	ratings?: MovieRatings;
	genres?: string[];
	imdbId?: string;
	folder?: string;
	isExisting?: boolean;
	isExcluded?: boolean;
}

type SortKey = "title" | "movies" | "rating" | "year";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";
type ReleaseSortKey = "title" | "quality" | "size" | "indexer" | "seeders" | "leechers" | "age" | "languages";

interface ReleaseQuality {
	quality?: { name?: string };
}

interface Release {
	guid: string;
	title: string;
	quality: ReleaseQuality;
	size: number;
	indexer: string;
	indexerId: number;
	seeders: number;
	leechers: number;
	languages: { name: string }[];
	approved: boolean;
	rejected: boolean;
	rejections: string[];
	protocol: string;
	age: number;
}

const TAG_COLORS: Record<string, string> = {
	david: "#6366f1",
	luca: "#f59e0b",
	shared: "#10b981",
};

const getUser = (rootFolderPath: string) => {
	const parts = rootFolderPath.split("/").filter(Boolean);
	return parts.length > 1 ? parts[parts.length - 1] : "shared";
};

const getPoster = (images: RadarrImage[]) =>
	images.find((i) => i.coverType === "poster")?.remoteUrl ??
	images.find((i) => i.coverType === "poster")?.url ??
	"";

const getFanart = (images: RadarrImage[]) =>
	images.find((i) => i.coverType === "fanart")?.remoteUrl ??
	images.find((i) => i.coverType === "fanart")?.url ??
	"";

const getTagNames = (tags: number[], tagMap: Record<number, string>) =>
	tags.map((t) => tagMap[t] ?? `tag-${t}`);

const getMovieRating = (movie: RadarrMovie) =>
	movie.ratings.tmdb?.value ?? movie.ratings.imdb?.value ?? movie.ratings.trakt?.value ?? 0;

const collectionRating = (collection: RadarrCollection) => {
	if (!collection.movies.length) return 0;
	const sum = collection.movies.reduce((acc, movie) => acc + getMovieRating(movie), 0);
	return sum / collection.movies.length;
};

const collectionYear = (collection: RadarrCollection) =>
	Math.max(0, ...collection.movies.map((m) => m.year));

const formatRuntime = (minutes: number) => {
	if (!minutes) return "-";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${h}h ${m}m`;
};

const formatSize = (bytes: number) => {
	if (!bytes) return "-";
	const gb = bytes / (1024 * 1024 * 1024);
	if (gb >= 1) return `${gb.toFixed(2)} GB`;
	const mb = bytes / (1024 * 1024);
	return `${mb.toFixed(0)} MB`;
};

const getReleaseQualityName = (release: Release) => release.quality?.quality?.name ?? "";

const getReleaseLanguages = (release: Release) =>
	release.languages?.map((language) => language.name).join(", ") ?? "";

const normalizeMovie = (item: Partial<RadarrApiItem>): RadarrMovie => ({
	tmdbId: item.tmdbId ?? 0,
	imdbId: item.imdbId,
	title: item.title ?? "Unknown title",
	status: item.status ?? (item.isExisting === false ? "Missing" : "Available"),
	overview: item.overview ?? "",
	runtime: item.runtime ?? 0,
	year: item.year ?? 0,
	ratings: item.ratings ?? {},
	genres: item.genres ?? [],
	images: item.images ?? [],
	folder: item.folder,
	isExisting: item.isExisting,
	isExcluded: item.isExcluded,
});

const normalizeCollection = (item: RadarrApiItem): RadarrCollection => {
	const movies = Array.isArray(item.movies) && item.movies.length
		? item.movies.map((movie) => normalizeMovie(movie))
		: [normalizeMovie(item)];

	return {
		id: item.id,
		title: item.title ?? "Unknown title",
		sortTitle: item.sortTitle ?? item.title ?? "",
		tmdbId: item.tmdbId,
		images: item.images ?? [],
		overview: item.overview ?? "",
		monitored: Boolean(item.monitored),
		rootFolderPath: item.rootFolderPath ?? "",
		folder: item.folder,
		qualityProfileId: item.qualityProfileId ?? 0,
		searchOnAdd: Boolean(item.searchOnAdd),
		minimumAvailability: item.minimumAvailability ?? "unknown",
		movies,
		tags: item.tags ?? [],
		path: item.path ?? "",
	};
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
		<div className="radarr-stat-card">
			<div className="radarr-stat-icon" style={{ background: `${color}18` }}>
				<Icon size={20} style={{ color }} />
			</div>
			<div className="radarr-stat-info">
				<span className="radarr-stat-value">{value}</span>
				<span className="radarr-stat-label">{label}</span>
			</div>
		</div>
	);
}

function CollectionModal({
	collection,
	onClose,
	onDelete,
	onEdit,
	tagMap,
}: {
	collection: RadarrCollection;
	onClose: () => void;
	onDelete: (collection: RadarrCollection) => void;
	onEdit: (collection: RadarrCollection) => void;
	tagMap: Record<number, string>;
}) {
	const poster = getPoster(collection.images);
	const fanart = getFanart(collection.images);
	const user = getUser(collection.rootFolderPath);
	const tags = getTagNames(collection.tags ?? [], tagMap);

	return (
		<div className="radarr-modal-overlay" onClick={onClose}>
			<div className="radarr-modal-content" onClick={(e) => e.stopPropagation()}>
				<button className="radarr-modal-close" onClick={onClose}>
					<X size={20} />
				</button>
				<div
					className="radarr-modal-hero"
					style={{ backgroundImage: fanart ? `url(${fanart})` : undefined }}
				>
					<div className="radarr-modal-hero-overlay" />
					<div className="radarr-modal-hero-inner">
						{poster && <img src={poster} alt={collection.title} className="radarr-modal-poster" />}
						<div className="radarr-modal-hero-info">
							<h2>{collection.title}</h2>
							<div className="radarr-modal-meta-row">
								<span className={`radarr-status-badge ${collection.monitored ? "radarr-status-on" : "radarr-status-off"}`}>
									{collection.monitored ? "Monitored" : "Unmonitored"}
								</span>
								<span>
									<User size={13} /> {user}
								</span>
								<span>
									<Film size={13} /> {collection.movies.length} movies
								</span>
								<span>
									<Star size={13} /> {collectionRating(collection).toFixed(1)}
								</span>
							</div>
							{tags.length > 0 && (
								<div className="radarr-modal-tags">
									{tags.map((tag) => (
										<span
											key={tag}
											className="radarr-tag"
											style={{
												borderColor: TAG_COLORS[tag] ?? "#64748b",
												color: TAG_COLORS[tag] ?? "#94a3b8",
											}}
										>
											<Tag size={11} /> {tag}
										</span>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="radarr-modal-body">
					<p className="radarr-modal-overview">{collection.overview}</p>
					<h3 className="radarr-modal-section-title">Movies</h3>
					<div className="radarr-modal-movies">
						{collection.movies.map((movie) => (
							<div key={movie.tmdbId} className="radarr-modal-movie-row">
								<div>
									<strong>{movie.title}</strong> <span>({movie.year})</span>
								</div>
								<div className="radarr-modal-movie-meta">
									<span className="radarr-status-pill">{movie.status}</span>
									<span>
										<Clock size={12} /> {formatRuntime(movie.runtime)}
									</span>
									<span>
										<Star size={12} /> {getMovieRating(movie).toFixed(1)}
									</span>
									{movie.imdbId && (
										<a href={`https://www.imdb.com/title/${movie.imdbId}`} target="_blank" rel="noreferrer">
											IMDb <ExternalLink size={12} />
										</a>
									)}
								</div>
							</div>
						))}
					</div>
					<div className="radarr-modal-actions">
						<button className="radarr-btn radarr-btn-edit" onClick={() => { onClose(); onEdit(collection); }}>
							<Edit3 size={14} /> Edit
						</button>
						<button className="radarr-btn radarr-btn-delete" onClick={() => { onClose(); onDelete(collection); }}>
							<Trash2 size={14} /> Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function ReleaseSearchModal({
	movieTitle,
	releases,
	loading,
	onClose,
	onGrab,
	grabbingGuid,
}: {
	movieTitle: string;
	releases: Release[];
	loading: boolean;
	onClose: () => void;
	onGrab: (release: Release) => void;
	grabbingGuid: string | null;
}) {
	const [releaseSortKey, setReleaseSortKey] = useState<ReleaseSortKey>("age");
	const [releaseSortDir, setReleaseSortDir] = useState<SortDir>("asc");

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
			<span className={`radarr-release-sort-indicator ${releaseSortKey === key ? "is-active" : ""}`}>
				{releaseSortKey === key ? (releaseSortDir === "asc" ? "↑" : "↓") : <ArrowUpDown size={12} />}
			</span>
		</>
	);

	return (
		<div className="radarr-modal-overlay" onClick={onClose}>
			<div className="radarr-release-modal" onClick={(e) => e.stopPropagation()}>
				<div className="radarr-release-modal-header">
					<h2>
						<Search size={18} /> Interactive Search – {movieTitle}
					</h2>
					<button className="radarr-modal-close" onClick={onClose}>
						<X size={20} />
					</button>
				</div>
				<div className="radarr-release-modal-body">
					{loading ? (
						<div className="radarr-release-loading">
							<Loader2 size={24} className="radarr-spin" /> Searching releases...
						</div>
					) : releases.length === 0 ? (
						<div className="radarr-release-empty">No releases found.</div>
					) : (
						<div className="radarr-release-table-wrapper">
							<div className="radarr-release-summary">
								<span>{sortedReleases.length} releases</span>
								<span>
									Sorted by {releaseSortKey} {releaseSortDir === "asc" ? "ascending" : "descending"}
								</span>
							</div>
							<table className="radarr-release-table">
								<thead>
									<tr>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("title")}>
												{renderSortLabel("title", "Title")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("quality")}>
												{renderSortLabel("quality", "Quality")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("size")}>
												{renderSortLabel("size", "Size")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("indexer")}>
												{renderSortLabel("indexer", "Indexer")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("seeders")}>
												{renderSortLabel("seeders", "Seeds")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("leechers")}>
												{renderSortLabel("leechers", "Peers")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("age")}>
												{renderSortLabel("age", "Age")}
											</button>
										</th>
										<th>
											<button className="radarr-release-sort-button" onClick={() => toggleReleaseSort("languages")}>
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
											className={release.rejected ? "radarr-release-rejected" : "radarr-release-approved"}
										>
											<td className="radarr-release-title-cell" title={release.title}>
												{release.title}
												{release.rejected && release.rejections?.length > 0 && (
													<div className="radarr-release-rejections">
														{release.rejections.map((r, i) => (
															<span key={i}>{r}</span>
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
													className="radarr-btn radarr-btn-grab"
													disabled={grabbingGuid === release.guid}
													onClick={() => onGrab(release)}
													title="Grab release"
												>
													{grabbingGuid === release.guid ? (
														<Loader2 size={14} className="radarr-spin" />
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

const Radarr = () => {
	const [collections, setCollections] = useState<RadarrCollection[]>([]);
	const [tags, setTags] = useState<RadarrTag[]>([]);
	const [rootFolders, setRootFolders] = useState<RootFolder[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "monitored" | "unmonitored">("all");
	const [userFilter, setUserFilter] = useState<string>("all");
	const [tagFilter, setTagFilter] = useState<string>("all");
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [selectedCollection, setSelectedCollection] = useState<RadarrCollection | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState({ path: "", tags: [] as number[] });
	const [moveFiles, setMoveFiles] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
	const [releaseSearchMovie, setReleaseSearchMovie] = useState<RadarrCollection | null>(null);
	const [releases, setReleases] = useState<Release[]>([]);
	const [releasesLoading, setReleasesLoading] = useState(false);
	const [grabbingGuid, setGrabbingGuid] = useState<string | null>(null);

	const getCollectionKey = (collection: RadarrCollection) => collection.id ?? collection.tmdbId;

	const tagMap = useMemo(() => {
		const map: Record<number, string> = {};
		tags.forEach((tag) => {
			map[tag.id] = tag.label;
		});
		return map;
	}, [tags]);

	const loadCollections = async () => {
		setLoading(true);
		setError(null);

		try {
			const [moviesRes, tagsRes, rootFoldersRes] = await Promise.all([
				fetch("/api/radarr/movies"),
				fetch("/api/radarr/tags"),
				fetch("/api/radarr/rootFolders"),
			]);

			if (!moviesRes.ok) {
				throw new Error(`HTTP ${moviesRes.status}`);
			}
			if (!tagsRes.ok) {
				throw new Error(`Tags: HTTP ${tagsRes.status}`);
			}
			if (!rootFoldersRes.ok) {
				throw new Error(`Root folders: HTTP ${rootFoldersRes.status}`);
			}

			const [moviesData, tagsData, rootFoldersData] = await Promise.all([
				moviesRes.json() as Promise<RadarrApiItem[]>,
				tagsRes.json() as Promise<RadarrTag[]>,
				rootFoldersRes.json() as Promise<RootFolder[]>,
			]);

			setCollections(Array.isArray(moviesData) ? moviesData.map(normalizeCollection) : []);
			setTags(tagsData);
			setRootFolders(rootFoldersData);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load collections");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadCollections();
	}, []);

	const users = useMemo(() => {
		const set = new Set(rootFolders.map((folder) => getUser(folder.path)));
		return Array.from(set).sort();
	}, [rootFolders]);

	const availableTags = useMemo(
		() => [...tags].sort((a, b) => a.label.localeCompare(b.label)),
		[tags]
	);

	const filtered = useMemo(() => {
		const result = collections.filter((c) => {
			const q = search.toLowerCase();
			const matchSearch =
				!q ||
				c.title.toLowerCase().includes(q) ||
				c.movies.some((m) => m.title.toLowerCase().includes(q));
			const matchStatus =
				statusFilter === "all" ||
				(statusFilter === "monitored" ? c.monitored : !c.monitored);
			const matchUser = userFilter === "all" || getUser(c.rootFolderPath) === userFilter;
			const matchTag = tagFilter === "all" || c.tags?.includes(Number(tagFilter));
			return matchSearch && matchStatus && matchUser && matchTag;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case "title":
					cmp = a.title.localeCompare(b.title);
					break;
				case "movies":
					cmp = a.movies.length - b.movies.length;
					break;
				case "rating":
					cmp = collectionRating(a) - collectionRating(b);
					break;
				case "year":
					cmp = collectionYear(a) - collectionYear(b);
					break;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [collections, search, statusFilter, userFilter, tagFilter, sortKey, sortDir]);

	const totalMovies = useMemo(
		() => collections.reduce((acc, c) => acc + c.movies.length, 0),
		[collections]
	);
	const avgRating = useMemo(() => {
		if (!collections.length) return "0";
		const sum = collections.reduce((acc, c) => acc + collectionRating(c), 0);
		return (sum / collections.length).toFixed(1);
	}, [collections]);
	const avgRuntime = useMemo(() => {
		const movies = collections.flatMap((c) => c.movies);
		if (!movies.length) return "-";
		const sum = movies.reduce((acc, m) => acc + m.runtime, 0);
		return formatRuntime(Math.round(sum / movies.length));
	}, [collections]);

	const handleDelete = async (collection: RadarrCollection) => {
		if (!window.confirm("Are you sure you want to delete this collection?")) return;
		if (collection.id == null) {
			setError("Failed to delete collection: missing Radarr id.");
			return;
		}

		setError(null);

		try {
			const response = await fetch(`/api/radarr/movies/${collection.id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			setSelectedIds((prev) => {
				const next = new Set(prev);
				next.delete(getCollectionKey(collection));
				return next;
			});
			setSelectedCollection((prev) =>
				prev && getCollectionKey(prev) === getCollectionKey(collection) ? null : prev
			);
			await loadCollections();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete collection");
		}
	};

	const handleBatchDelete = async () => {
		if (selectedIds.size === 0) return;
		if (!window.confirm(`Delete ${selectedIds.size} selected collections?`)) return;

		const selectedCollections = collections.filter((collection) =>
			selectedIds.has(getCollectionKey(collection))
		);
		const missingIds = selectedCollections.some((collection) => collection.id == null);
		if (missingIds) {
			setError("Failed to delete one or more collections: missing Radarr id.");
			return;
		}

		setError(null);

		try {
			await Promise.all(
				selectedCollections.map(async (collection) => {
					const response = await fetch(`/api/radarr/movies/${collection.id}`, {
						method: "DELETE",
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}
				})
			);

			setSelectedIds(new Set());
			setSelectedCollection((prev) =>
				prev && selectedIds.has(getCollectionKey(prev)) ? null : prev
			);
			await loadCollections();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete collections");
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
			setSelectedIds(new Set(filtered.map((collection) => getCollectionKey(collection))));
		}
	};

	const startEdit = (collection: RadarrCollection) => {
		setEditingId(collection.tmdbId);
		setEditForm({ path: collection.rootFolderPath, tags: [...(collection.tags ?? [])] });
		setMoveFiles(false);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setMoveFiles(false);
	};

	const saveEdit = async (collection: RadarrCollection) => {
		if (collection.id == null) {
			setError("Failed to update collection: missing Radarr id.");
			return;
		}

		setError(null);

		try {
			const payload = {
				rootFolderPath: editForm.path,
				tags: editForm.tags,
			};
			const url = moveFiles
				? `/api/radarr/movies/${collection.id}?moveFiles=true`
				: `/api/radarr/movies/${collection.id}`;
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
			setMoveFiles(false);
			await loadCollections();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update collection");
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

	const openReleaseSearch = async (collection: RadarrCollection) => {
		if (collection.id == null) return;
		setReleaseSearchMovie(collection);
		setReleases([]);
		setReleasesLoading(true);
		try {
			const res = await fetch(`/api/radarr/release?movieId=${collection.id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			setReleases(data as Release[]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to search releases");
		} finally {
			setReleasesLoading(false);
		}
	};

	const handleGrabRelease = async (release: Release) => {
		setGrabbingGuid(release.guid);
		try {
			const res = await fetch("/api/radarr/release", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(release),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			setReleases((prev) => prev.filter((r) => r.guid !== release.guid));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to grab release");
		} finally {
			setGrabbingGuid(null);
		}
	};

	if (loading) {
		return (
			<div className="radarr-page">
				<div className="radarr-loading">Loading collections...</div>
			</div>
		);
	}

	return (
		<div className="radarr-page">
			<header className="radarr-header">
				<div>
					<h1 className="radarr-title">
						<Film size={28} /> Radarr
					</h1>
					<p className="radarr-subtitle">
						{filtered.length} of {collections.length} collections
					</p>
				</div>
				<div className="radarr-view-toggle">
					<button
						className={`radarr-view-btn ${viewMode === "grid" ? "active" : ""}`}
						onClick={() => setViewMode("grid")}
					>
						<LayoutGrid size={16} />
					</button>
					<button
						className={`radarr-view-btn ${viewMode === "list" ? "active" : ""}`}
						onClick={() => setViewMode("list")}
					>
						<List size={16} />
					</button>
				</div>
			</header>

			<div className="radarr-stats-row">
				<StatCard icon={Tv} label="Collections" value={collections.length} color="#8b5cf6" />
				<StatCard icon={Film} label="Movies" value={totalMovies} color="#3b82f6" />
				<StatCard icon={Star} label="Avg Rating" value={avgRating} color="#22c55e" />
				<StatCard icon={Clock} label="Avg Runtime" value={avgRuntime} color="#f59e0b" />
			</div>

			<div className="radarr-toolbar">
				<div className="radarr-search-wrapper">
					<Search size={16} className="radarr-search-icon" />
					<input
						type="text"
						placeholder="Search collections or movies..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="radarr-search-input"
					/>
				</div>
				<div className="radarr-filters">
					<Filter size={15} />
					<div className="radarr-filter-group">
						{(["all", "monitored", "unmonitored"] as const).map((f) => (
							<button
								key={f}
								className={`radarr-filter-btn ${statusFilter === f ? "active" : ""}`}
								onClick={() => setStatusFilter(f)}
							>
								{f === "all" ? "All" : f === "monitored" ? "Monitored" : "Unmonitored"}
							</button>
						))}
					</div>
					<div className="radarr-filter-group">
						<User size={15} />
						<select
							value={userFilter}
							onChange={(e) => setUserFilter(e.target.value)}
							className="radarr-select"
						>
							<option value="all">All users</option>
							{users.map((u) => (
								<option key={u} value={u}>
									{u}
								</option>
							))}
						</select>
					</div>
					<div className="radarr-filter-group">
						<Tag size={15} />
						<select
							value={tagFilter}
							onChange={(e) => setTagFilter(e.target.value)}
							className="radarr-select"
						>
							<option value="all">All tags</option>
							{availableTags.map((tag) => (
								<option key={tag.id} value={tag.id.toString()}>
									{tag.label}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{error && <div className="radarr-empty">{error}</div>}

			<div className="radarr-sort-row">
				<span className="radarr-sort-label">
					<ArrowUpDown size={14} /> Sort by:
				</span>
				{(
					[
						["title", "Title"],
						["movies", "Movies"],
						["rating", "Rating"],
						["year", "Latest Year"],
					] as [SortKey, string][]
				).map(([key, label]) => (
					<button
						key={key}
						className={`radarr-sort-btn ${sortKey === key ? "active" : ""}`}
						onClick={() => toggleSort(key)}
					>
						{label} {sortKey === key && (sortDir === "asc" ? "↑" : "↓")}
					</button>
				))}
			</div>

			{selectedIds.size > 0 && (
				<div className="radarr-batch-bar">
					<span>{selectedIds.size} selected</span>
					<button className="radarr-btn radarr-btn-delete" onClick={handleBatchDelete}>
						<Trash2 size={14} /> Delete selected
					</button>
					<button className="radarr-btn radarr-btn-cancel" onClick={() => setSelectedIds(new Set())}>
						<X size={14} /> Clear
					</button>
				</div>
			)}

			{viewMode === "grid" && (
				<div className="radarr-grid">
					{filtered.map((collection) => (
						<div
							key={collection.tmdbId}
							className={`radarr-card ${selectedIds.has(getCollectionKey(collection)) ? "radarr-card--selected" : ""}`}
						>
							{editingId === collection.tmdbId ? (
								<div className="radarr-card-edit">
									<label>
										<span>Path</span>
										<select
											value={editForm.path}
											onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
										>
											{rootFolders.map((rootFolder) => (
												<option key={rootFolder.id} value={rootFolder.path}>
													{rootFolder.path}
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
									<label className="radarr-edit-move-files">
										<input
											type="checkbox"
											checked={moveFiles}
											onChange={(e) => setMoveFiles(e.target.checked)}
										/>
										<span>Move files to new path</span>
									</label>
									<div className="radarr-edit-actions">
										<button className="radarr-btn radarr-btn-save" onClick={() => void saveEdit(collection)}>
											<Check size={14} /> Save
										</button>
										<button className="radarr-btn radarr-btn-cancel" onClick={cancelEdit}>
											<X size={14} /> Cancel
										</button>
									</div>
								</div>
							) : (
								<div className="radarr-card-clickable" onClick={() => setSelectedCollection(collection)}>
									<div className="radarr-card-poster">
										{getPoster(collection.images) ? (
											<img src={getPoster(collection.images)} alt={collection.title} />
										) : (
											<div className="radarr-card-poster-placeholder">
												<Tv size={40} />
											</div>
										)}
										<span className={`radarr-status-badge ${collection.monitored ? "radarr-status-on" : "radarr-status-off"}`}>
											{collection.monitored ? "Monitored" : "Unmonitored"}
										</span>
										<span className="radarr-user-badge">{getUser(collection.rootFolderPath)}</span>
										<button
											className="radarr-card-select"
											onClick={(e) => {
												e.stopPropagation();
												toggleSelect(getCollectionKey(collection));
											}}
										>
											{selectedIds.has(getCollectionKey(collection)) ? <CheckSquare size={18} /> : <Square size={18} />}
										</button>
									</div>
									<div className="radarr-card-body">
										<h3 className="radarr-card-title">{collection.title}</h3>
										<div className="radarr-card-meta">
											<span>
												<Film size={13} /> {collection.movies.length} movies
											</span>
											<span>
												<Star size={13} /> {collectionRating(collection).toFixed(1)}
											</span>
											<span>
												<Calendar size={13} /> {collectionYear(collection) || "-"}
											</span>
										</div>
										{collection.tags?.length ? (
											<div className="radarr-card-tags">
												{getTagNames(collection.tags, tagMap).map((tag) => (
													<span
														key={tag}
														className="radarr-tag"
														style={{
															borderColor: TAG_COLORS[tag] ?? "#64748b",
															color: TAG_COLORS[tag] ?? "#94a3b8",
														}}
													>
														{tag}
													</span>
												))}
											</div>
										) : null}
										<div className="radarr-card-actions" onClick={(e) => e.stopPropagation()}>
											<button className="radarr-btn radarr-btn-search" onClick={() => void openReleaseSearch(collection)} title="Interactive Search">
												<Search size={14} />
											</button>
											<button className="radarr-btn radarr-btn-edit" onClick={() => startEdit(collection)}>
												<Edit3 size={14} />
											</button>
											<button className="radarr-btn radarr-btn-delete" onClick={() => void handleDelete(collection)}>
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
				<div className="radarr-list">
					<div className="radarr-list-header">
						<div className="radarr-list-check" onClick={toggleSelectAll}>
							{selectedIds.size === filtered.length && filtered.length > 0 ? (
								<CheckSquare size={16} />
							) : (
								<Square size={16} />
							)}
						</div>
						<div className="radarr-list-col radarr-list-col--title">Title</div>
						<div className="radarr-list-col radarr-list-col--movies">Movies</div>
						<div className="radarr-list-col radarr-list-col--rating">Rating</div>
						<div className="radarr-list-col radarr-list-col--year">Latest Year</div>
						<div className="radarr-list-col radarr-list-col--user">User</div>
						<div className="radarr-list-col radarr-list-col--tags">Tags</div>
						<div className="radarr-list-col radarr-list-col--actions">Actions</div>
					</div>
					{filtered.map((collection) => (
						<div
							key={collection.tmdbId}
							className={`radarr-list-row ${selectedIds.has(getCollectionKey(collection)) ? "radarr-list-row--selected" : ""}`}
							onClick={() => setSelectedCollection(collection)}
						>
							<div
								className="radarr-list-check"
								onClick={(e) => {
									e.stopPropagation();
									toggleSelect(getCollectionKey(collection));
								}}
							>
								{selectedIds.has(getCollectionKey(collection)) ? <CheckSquare size={16} /> : <Square size={16} />}
							</div>
							<div className="radarr-list-col radarr-list-col--title">
								<span className="radarr-list-title">{collection.title}</span>
							</div>
							<div className="radarr-list-col radarr-list-col--movies">{collection.movies.length}</div>
							<div className="radarr-list-col radarr-list-col--rating">
								{collectionRating(collection).toFixed(1)}
							</div>
							<div className="radarr-list-col radarr-list-col--year">
								{collectionYear(collection) || "-"}
							</div>
							<div className="radarr-list-col radarr-list-col--user">
								{getUser(collection.rootFolderPath)}
							</div>
							<div className="radarr-list-col radarr-list-col--tags">
								{getTagNames(collection.tags ?? [], tagMap).map((tag) => (
									<span
										key={tag}
										className="radarr-tag-sm"
										style={{ color: TAG_COLORS[tag] ?? "#94a3b8" }}
									>
										{tag}
									</span>
								))}
							</div>
							<div className="radarr-list-col radarr-list-col--actions" onClick={(e) => e.stopPropagation()}>
								<button className="radarr-btn radarr-btn-search" onClick={() => void openReleaseSearch(collection)} title="Interactive Search">
									<Search size={13} />
								</button>
								<button className="radarr-btn radarr-btn-edit" onClick={() => startEdit(collection)}>
									<Edit3 size={13} />
								</button>
								<button className="radarr-btn radarr-btn-delete" onClick={() => void handleDelete(collection)}>
									<Trash2 size={13} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{filtered.length === 0 && <div className="radarr-empty">No collections match your filters.</div>}

			{selectedCollection && (
				<CollectionModal
					collection={selectedCollection}
					onClose={() => setSelectedCollection(null)}
					onDelete={handleDelete}
					onEdit={startEdit}
					tagMap={tagMap}
				/>
			)}

			{releaseSearchMovie && (
				<ReleaseSearchModal
					movieTitle={releaseSearchMovie.title}
					releases={releases}
					loading={releasesLoading}
					onClose={() => setReleaseSearchMovie(null)}
					onGrab={handleGrabRelease}
					grabbingGuid={grabbingGuid}
				/>
			)}
		</div>
	);
};

export default Radarr;
