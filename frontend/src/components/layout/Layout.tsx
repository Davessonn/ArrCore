import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon?: LucideIcon;
  logoSrc?: string;
  logoAlt?: string;
};

const navItems: NavItem[] = [
  { path: "/", 
    logoSrc: "/logos/grafana.png",
    logoAlt: "Grafana logo", 
    label: "Dashboard" },
  {
    path: "/portainer",
    label: "Portainer",
    logoSrc: "/logos/portainer.png",
    logoAlt: "Portainer logo",
  },
  {
    path: "/sonarr",
    label: "Sonarr",
    logoSrc: "/logos/sonarr.png",
    logoAlt: "Sonarr logo",
  },
  {
    path: "/radarr",
    label: "Radarr",
    logoSrc: "/logos/radarr.png",
    logoAlt: "Radarr logo",
  },
  {
    path: "/qbittorrent",
    label: "qBittorrent",
    logoSrc: "/logos/qBittorrent_Logo.png",
    logoAlt: "qBittorrent logo",
  },
  {
    path: "/seerr",
    label: "Seerr",
    logoSrc: "/logos/seerr.png",
    logoAlt: "Seerr logo",
  },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((current) => !current);

  return (
    <div className={`app-layout${sidebarOpen ? " sidebar-open" : " sidebar-closed"}`}>
      <aside className={`app-sidebar${sidebarOpen ? " is-open" : " is-closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logos/ArrCoreLogo.png" alt="ArrCore logo" />
          </div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">ArrCore</span>
            <span className="sidebar-brand-sub">Media Manager</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle sidebar-toggle--desktop"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Oldalsav becsukasa" : "Oldalsav kinyitasa"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Navigation</span>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              title={item.label}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              {item.logoSrc ? (
                <img src={item.logoSrc} alt={item.logoAlt ?? `${item.label} logo`} />
              ) : item.icon ? (
                <item.icon />
              ) : null}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>ArrCore v1.0</span>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-label="Oldalsav bezarasa"
        />
      ) : null}

      <main className="app-main">
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--mobile"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Oldalsav becsukasa" : "Oldalsav kinyitasa"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>
        <Outlet />
      </main>
    </div>
  );
}
