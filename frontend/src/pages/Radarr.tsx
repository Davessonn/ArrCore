import { useEffect, useMemo, useState } from "react";
import {
	ArrowUpDown,
	Calendar,
	Check,
	CheckSquare,
	Edit3,
	ExternalLink,
	Filter,
	Film,
	LayoutGrid,
	List,
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
	qualityProfileId: number;
	searchOnAdd: boolean;
	minimumAvailability: string;
	movies: RadarrMovie[];
	tags: number[];
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

const TAG_MAP: Record<number, string> = { 1: "david", 2: "luca", 3: "shared" };
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

const getTagNames = (tags: number[]) =>
	tags.map((t) => TAG_MAP[t] ?? `tag-${t}`);

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
		qualityProfileId: item.qualityProfileId ?? 0,
		searchOnAdd: Boolean(item.searchOnAdd),
		minimumAvailability: item.minimumAvailability ?? "unknown",
		movies,
		tags: item.tags ?? [],
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
}: {
	collection: RadarrCollection;
	onClose: () => void;
	onDelete: (id: number) => void;
	onEdit: (collection: RadarrCollection) => void;
}) {
	const poster = getPoster(collection.images);
	const fanart = getFanart(collection.images);
	const user = getUser(collection.rootFolderPath);
	const tags = getTagNames(collection.tags ?? []);

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
						<button className="radarr-btn radarr-btn-delete" onClick={() => { onClose(); onDelete(collection.tmdbId); }}>
							<Trash2 size={14} /> Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

const Radarr = () => {
	const [collections, setCollections] = useState<RadarrCollection[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "monitored" | "unmonitored">("all");
	const [userFilter, setUserFilter] = useState<string>("all");
	const [tagFilter, setTagFilter] = useState<string>("all");
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [selectedCollection, setSelectedCollection] = useState<RadarrCollection | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState({ title: "", rootFolderPath: "", overview: "" });
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

	useEffect(() => {
		fetch("/api/radarr/movies")
			.then((res) => res.json())
			.then((data: RadarrApiItem[]) => {
				setCollections(Array.isArray(data) ? data.map(normalizeCollection) : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	const users = useMemo(() => {
		const set = new Set(collections.map((c) => getUser(c.rootFolderPath)));
		return Array.from(set).sort();
	}, [collections]);

	const allTags = useMemo(() => {
		const set = new Set<string>();
		collections.forEach((c) => getTagNames(c.tags ?? []).forEach((t) => set.add(t)));
		return Array.from(set).sort();
	}, [collections]);

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
			const matchTag = tagFilter === "all" || getTagNames(c.tags ?? []).includes(tagFilter);
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

	const handleDelete = (id: number) => {
		if (!window.confirm("Are you sure you want to delete this collection?")) return;
		setCollections((prev) => prev.filter((c) => c.tmdbId !== id));
		setSelectedIds((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	};

	const handleBatchDelete = () => {
		if (selectedIds.size === 0) return;
		if (!window.confirm(`Delete ${selectedIds.size} selected collections?`)) return;
		setCollections((prev) => prev.filter((c) => !selectedIds.has(c.tmdbId)));
		setSelectedIds(new Set());
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
			setSelectedIds(new Set(filtered.map((c) => c.tmdbId)));
		}
	};

	const startEdit = (collection: RadarrCollection) => {
		setEditingId(collection.tmdbId);
		setEditForm({
			title: collection.title,
			rootFolderPath: collection.rootFolderPath,
			overview: collection.overview,
		});
	};

	const cancelEdit = () => setEditingId(null);

	const saveEdit = (id: number) => {
		setCollections((prev) =>
			prev.map((c) =>
				c.tmdbId === id
					? { ...c, title: editForm.title, rootFolderPath: editForm.rootFolderPath, overview: editForm.overview }
					: c
			)
		);
		setEditingId(null);
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
						<Tv size={28} /> Radarr
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
							{allTags.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

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
							className={`radarr-card ${selectedIds.has(collection.tmdbId) ? "radarr-card--selected" : ""}`}
						>
							{editingId === collection.tmdbId ? (
								<div className="radarr-card-edit">
									<label>
										<span>Title</span>
										<input
											value={editForm.title}
											onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
										/>
									</label>
									<label>
										<span>Root path</span>
										<input
											value={editForm.rootFolderPath}
											onChange={(e) => setEditForm({ ...editForm, rootFolderPath: e.target.value })}
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
									<div className="radarr-edit-actions">
										<button className="radarr-btn radarr-btn-save" onClick={() => saveEdit(collection.tmdbId)}>
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
												toggleSelect(collection.tmdbId);
											}}
										>
											{selectedIds.has(collection.tmdbId) ? <CheckSquare size={18} /> : <Square size={18} />}
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
												{getTagNames(collection.tags).map((tag) => (
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
											<button className="radarr-btn radarr-btn-edit" onClick={() => startEdit(collection)}>
												<Edit3 size={14} />
											</button>
											<button className="radarr-btn radarr-btn-delete" onClick={() => handleDelete(collection.tmdbId)}>
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
							className={`radarr-list-row ${selectedIds.has(collection.tmdbId) ? "radarr-list-row--selected" : ""}`}
							onClick={() => setSelectedCollection(collection)}
						>
							<div
								className="radarr-list-check"
								onClick={(e) => {
									e.stopPropagation();
									toggleSelect(collection.tmdbId);
								}}
							>
								{selectedIds.has(collection.tmdbId) ? <CheckSquare size={16} /> : <Square size={16} />}
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
								{getTagNames(collection.tags ?? []).map((tag) => (
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
								<button className="radarr-btn radarr-btn-edit" onClick={() => startEdit(collection)}>
									<Edit3 size={13} />
								</button>
								<button className="radarr-btn radarr-btn-delete" onClick={() => handleDelete(collection.tmdbId)}>
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
				/>
			)}
		</div>
	);
};

export default Radarr;
