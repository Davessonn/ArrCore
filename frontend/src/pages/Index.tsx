import { Link } from "react-router-dom";

const modules = [
  {
    name: "Portainer",
    path: "/portainer",
    description: "Docker kontenerek, stackek es allapotok attekintese.",
  },
  {
    name: "Radarr",
    path: "/radarr",
    description: "Radarr gyujtemenyek es filmek attekintese.",
  },
  {
    name: "Sonarr",
    path: "/sonarr",
    description: "Sonarr modul helye. A tovabbi integracio ide kerulhet.",
  },
];

const Index = () => {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "2rem 1.5rem",
        color: "#e2e8f0",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>ArrCore</h1>
        <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
          Valassz egy modult az admin feluleten.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            style={{
              display: "block",
              textDecoration: "none",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "1.25rem",
              color: "#e2e8f0",
            }}
          >
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {module.name}
            </div>
            <div style={{ color: "#94a3b8", lineHeight: 1.5 }}>{module.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Index;
