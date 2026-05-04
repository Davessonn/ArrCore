import { useEffect, useState } from "react";

type ContainerLabels = Record<string, string | undefined>;

interface Container {
  Id: string;
  Labels?: ContainerLabels;
  State: string;
  Status: string;
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  padding: "1.5rem",
  margin: "1rem 0",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  minWidth: "250px",
  maxWidth: "350px",
};

const gridStyle: React.CSSProperties = {

  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)", // Always 5 columns per row
  gap: "1.5rem",
  marginTop: "2rem",
};

const labelStyle: React.CSSProperties = {
  color: "#888",
  fontSize: "0.95em",
  marginBottom: "0.2em",
};

const valueStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: "1.1em",
  color: "#222",
};

const Containers: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/portainer/containers");
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setContainers(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchContainers();
  }, []);

  if (loading) return <div style={{ padding: "2rem" }}>Loading containers...</div>;
  if (error) return <div style={{ color: "red", padding: "2rem" }}>Error: {error}</div>;

  const getLabel = (labels: ContainerLabels | undefined, key: string) =>
    labels?.[key] ?? "-";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <h2 style={{ fontWeight: 700, fontSize: "2rem", marginBottom: "1.5rem" }}>Containers</h2>
      <div style={gridStyle}>
        {containers.map((container) => (
          <div key={container.Id} style={cardStyle}>
            <div>
              <div style={labelStyle}>Service</div>
              <div style={valueStyle}>{getLabel(container.Labels, "com.docker.compose.service")}</div>
            </div>
            <div>
              <div style={labelStyle}>State</div>
              <div style={valueStyle}>{container.State}</div>
            </div>
            <div>
              <div style={labelStyle}>Status</div>
              <div style={valueStyle}>{container.Status}</div>
            </div>
            <div>
              <div style={labelStyle}>Working dir</div>
              <div style={valueStyle}>{getLabel(container.Labels, "com.docker.compose.project.working_dir")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Containers;