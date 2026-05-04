import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Server,
  Activity,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Container,
  Layers,
  Filter,
  RefreshCw,
} from "lucide-react";
import "./Portainer.css";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Labels: Record<string, string>;
}

type StackGroup = { name: string; containers: DockerContainer[] };

// ── Helpers ────────────────────────────────────────────────────────────────────

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const containerName = (c: DockerContainer) =>
  c.Names[0]?.replace(/^\//, "") ?? "unknown";

const stackName = (c: DockerContainer) =>
  c.Labels["com.docker.compose.project"] ?? "standalone";

const imageShort = (img: string) => {
  const parts = img.split("/");
  return parts[parts.length - 1] ?? img;
};

const version = (c: DockerContainer) =>
  c.Labels["org.opencontainers.image.version"] ??
  c.Labels["build_version"]?.match(/version:- ([\w.\-]+)/)?.[1] ??
  null;

const description = (c: DockerContainer) =>
  c.Labels["org.opencontainers.image.description"] ?? null;

const stackColors: Record<string, string> = {
  media: "#8b5cf6",
  network: "#3b82f6",
  management: "#f59e0b",
  development: "#10b981",
  games: "#ef4444",
  standalone: "#6b7280",
};

const stackColor = (name: string) => stackColors[name] ?? "#6b7280";

// ── Components ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="stat-card-info">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
    </div>
  );
}

function StatusBadge({ state, status }: { state: string; status: string }) {
  const isRunning = state === "running";
  const isHealthy = status.includes("healthy");
  return (
    <span
      className={cn("status-badge", isRunning ? "status-running" : "status-stopped")}
    >
      <span
        className="status-dot"
        style={{
          background: isRunning ? (isHealthy ? "#22c55e" : "#3b82f6") : "#ef4444",
        }}
      />
      {isRunning ? (isHealthy ? "Healthy" : "Running") : "Stopped"}
    </span>
  );
}

function ContainerCard({ container }: { container: DockerContainer }) {
  const [expanded, setExpanded] = useState(false);
  const name = containerName(container);
  const ver = version(container);
  const desc = description(container);
  const stack = stackName(container);

  return (
    <div
      className={cn(
        "container-card",
        container.State !== "running" && "container-card--stopped"
      )}
    >
      <div className="container-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="container-card-title-row">
          <div className="container-card-icon" style={{ background: `${stackColor(stack)}20` }}>
            <Box size={18} style={{ color: stackColor(stack) }} />
          </div>
          <div className="container-card-title">
            <h3>{name}</h3>
            {ver && <span className="container-version">v{ver}</span>}
          </div>
        </div>
        <div className="container-card-right">
          <StatusBadge state={container.State} status={container.Status} />
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      <div className="container-card-meta">
        <span className="meta-item">
          <Clock size={13} />
          {container.Status}
        </span>
        <span className="meta-item">
          <Cpu size={13} />
          {imageShort(container.Image)}
        </span>
      </div>

      {expanded && (
        <div className="container-card-details">
          {desc && (
            <p className="container-desc">{desc.replace(/\[.*?\]\(.*?\)/g, "").replace(/\s+/g, " ").trim()}</p>
          )}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Image</span>
              <span className="detail-value">{container.Image}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Command</span>
              <span className="detail-value">{container.Command}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {new Date(container.Created * 1000).toLocaleDateString("hu-HU", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Container ID</span>
              <span className="detail-value">{container.Id.slice(0, 12)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Stack</span>
              <span className="detail-value">{stack}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Service</span>
              <span className="detail-value">
                {container.Labels["com.docker.compose.service"] ?? "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const Portainer = () => {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "running" | "stopped">("all");
  const [collapsedStacks, setCollapsedStacks] = useState<Set<string>>(new Set());

  const fetchContainers = () => {
    setLoading(true);
    setError(null);
    fetch("/api/portainer/containers")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: DockerContainer[]) => {
        setContainers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const filtered = useMemo(() => {
    return containers.filter((c) => {
      const name = containerName(c).toLowerCase();
      const image = c.Image.toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = !q || name.includes(q) || image.includes(q);
      const matchesState =
        stateFilter === "all" ||
        (stateFilter === "running" && c.State === "running") ||
        (stateFilter === "stopped" && c.State !== "running");
      return matchesSearch && matchesState;
    });
  }, [containers, search, stateFilter]);

  const stacks: StackGroup[] = useMemo(() => {
    const map = new Map<string, DockerContainer[]>();
    for (const c of filtered) {
      const s = stackName(c);
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(c);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, containers]) => ({ name, containers }));
  }, [filtered]);

  const totalContainers = containers.length;
  const runningCount = containers.filter((c) => c.State === "running").length;
  const stoppedCount = totalContainers - runningCount;
  const stackCount = new Set(containers.map(stackName)).size;

  const toggleStack = (name: string) => {
    setCollapsedStacks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="portainer-page">
      {/* Header */}
      <header className="portainer-header">
        <div>
          <h1 className="portainer-title">
            <Container size={28} />
            Portainer
          </h1>
          <p className="portainer-subtitle">Docker container management overview</p>
        </div>
        <button className="refresh-btn" onClick={fetchContainers} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="error-banner">Failed to load containers: {error}</div>
      )}

      {loading && containers.length === 0 ? (
        <div className="loading-state">Loading containers…</div>
      ) : (
        <>
          {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={Server} label="Total Containers" value={totalContainers} color="#8b5cf6" />
        <StatCard icon={Activity} label="Running" value={runningCount} color="#22c55e" />
        <StatCard icon={AlertTriangle} label="Stopped" value={stoppedCount} color="#ef4444" />
        <StatCard icon={Layers} label="Stacks" value={stackCount} color="#3b82f6" />
      </div>

      {/* Toolbar */}
      <div className="portainer-toolbar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search containers or images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <Filter size={15} />
          {(["all", "running", "stopped"] as const).map((f) => (
            <button
              key={f}
              className={cn("filter-btn", stateFilter === f && "filter-btn--active")}
              onClick={() => setStateFilter(f)}
            >
              {f === "all" ? "All" : f === "running" ? "Running" : "Stopped"}
            </button>
          ))}
        </div>
      </div>

      {/* Stacks */}
      <div className="stacks-list">
        {stacks.map((stack) => (
          <section key={stack.name} className="stack-section">
            <button
              className="stack-header"
              onClick={() => toggleStack(stack.name)}
            >
              <div className="stack-header-left">
                <span
                  className="stack-dot"
                  style={{ background: stackColor(stack.name) }}
                />
                <span className="stack-name">{stack.name}</span>
                <span className="stack-count">{stack.containers.length}</span>
              </div>
              {collapsedStacks.has(stack.name) ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronUp size={18} />
              )}
            </button>
            {!collapsedStacks.has(stack.name) && (
              <div className="stack-containers">
                {stack.containers.map((c) => (
                  <ContainerCard key={c.Id} container={c} />
                ))}
              </div>
            )}
          </section>
        ))}

        {stacks.length === 0 && (
          <div className="empty-state">No containers match your filters.</div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default Portainer;
