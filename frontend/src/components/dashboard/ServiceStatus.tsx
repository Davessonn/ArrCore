import { Tv, Film, Download, Play, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const serviceIcons: Record<string, React.ElementType> = {
  Sonarr: Tv,
  Radarr: Film,
  qBittorrent: Download,
  Jellyfin: Play,
};

type ServiceStatusType = "online" | "offline" | "warning";

interface Service {
  name: string;
  status: ServiceStatusType;
  version: string;
  color: string;
}

interface ServiceStatusProps {
  className?: string;
}

const getStatusConfig = (status: ServiceStatusType) => {
  switch (status) {
    case "online":
      return {
        label: "Online",
        class: "text-green-500",
        dot: "bg-green-500 animate-pulse",
      };
    case "offline":
      return {
        label: "Offline",
        class: "text-red-500",
        dot: "bg-red-500",
      };
    case "warning":
      return {
        label: "Warning",
        class: "text-yellow-500",
        dot: "bg-yellow-500",
      };
  }
};

const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};

export function ServiceStatus({ className }: ServiceStatusProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: Service[]) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading services…</div>;
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {services.map((service) => {
        const Icon = serviceIcons[service.name] || AlertCircle;
        const statusConfig = getStatusConfig(service.status);

        return (
          <div
            key={service.name}
            className={cn(
              "glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer",
              service.status === "online" && `hover:glow-${service.color}`
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-2 rounded-lg backdrop-blur-sm", `bg-${service.color}/10`)}>
                <Icon className={cn("h-5 w-5", `text-${service.color}`)} />
              </div>

              <div className={cn("flex items-center gap-1.5", statusConfig.class)}>
                <span className={cn("w-2 h-2 rounded-full", statusConfig.dot)} />
                <span className="text-xs font-medium">{statusConfig.label}</span>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-xs text-muted-foreground">v{service.version}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
