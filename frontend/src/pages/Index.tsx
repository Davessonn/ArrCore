import { Link } from "react-router-dom";
import {
  Container,
  Tv,
  Download,
  Clapperboard,
  ArrowRight,
} from "lucide-react";
import "./Index.css";

const modules = [
  {
    name: "Portainer",
    path: "/portainer",
    description: "Docker konténerek, stackek és állapotok áttekintése.",
    icon: Container,
    color: "#3b82f6",
  },
  {
    name: "Radarr",
    path: "/radarr",
    description: "Radarr gyujtemenyek es filmek attekintese.",
  },
  {
    name: "Sonarr",
    path: "/sonarr",
    description: "Sorozatok kezelése, monitorozás és letöltés állapot.",
    icon: Tv,
    color: "#10b981",
  },
  {
    name: "qBittorrent",
    path: "/qbittorrent",
    description: "Torrentek kezelése, sebesség és állapot figyelése.",
    icon: Download,
    color: "#f59e0b",
  },
  {
    name: "Seerr",
    path: "/seerr",
    description: "Filmek és sorozatok keresése, requestek kezelése.",
    icon: Clapperboard,
    color: "#8b5cf6",
  },
];

const Index = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Válassz egy modult az admin felületen.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {modules.map((module) => (
          <Link key={module.path} to={module.path} className="dashboard-card">
            <div className="dashboard-card-icon" style={{ background: `${module.color}15` }}>
              <module.icon size={24} style={{ color: module.color }} />
            </div>
            <div className="dashboard-card-content">
              <h3 className="dashboard-card-title">{module.name}</h3>
              <p className="dashboard-card-desc">{module.description}</p>
            </div>
            <div className="dashboard-card-arrow">
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Index;
