import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ServiceStatus } from "@/components/dashboard/ServiceStatus";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { DownloadQueue } from "@/components/dashboard/DownloadQueue";
import { RecentMedia } from "@/components/dashboard/RecentMedia";
import { UpcomingEpisodes } from "@/components/dashboard/UpcomingEpisodes";

const Index = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your media server
          </p>
        </div>

        {/* Service Status */}
        <ServiceStatus />

        {/* Stats Overview */}
        <StatsOverview />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Downloads & Recent */}
          <div className="xl:col-span-2 space-y-6">
            <DownloadQueue />
            <RecentMedia />
          </div>

          {/* Right Column - Upcoming */}
          <div className="xl:col-span-1">
            <UpcomingEpisodes />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
