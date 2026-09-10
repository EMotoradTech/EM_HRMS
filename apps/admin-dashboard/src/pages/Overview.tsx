import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { pingHealth } from "../lib/apiClient";
import { useSettings } from "../lib/settings";
import { SERVICES } from "../lib/services";

const MODULE_LINK: Record<string, string> = {
  documentEngine: "/documents",
  hrVault: "/vault",
  complianceReminders: "/compliance",
  assetManagement: "/assets",
  exitFormalities: "/exits",
  resumeScreening: "/resumes",
  bgvTracking: "/bgv",
  offerLetters: "/offers",
  inductionPortal: "/induction",
  productTraining: "/training",
  pulseSurvey: "/pulse",
};

function ServiceStatCard({ serviceKey, label, baseUrl }: { serviceKey: string; label: string; baseUrl: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["health", baseUrl],
    queryFn: () => pingHealth(baseUrl),
    refetchInterval: 15000,
    retry: false,
  });

  const tone = isLoading ? undefined : data ? "success" : "danger";

  return (
    <Link to={MODULE_LINK[serviceKey]} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="stat-card">
        <div className="stat-label">
          <span className={`badge ${tone ?? ""}`} style={{ padding: "1px 8px" }}>
            {isLoading ? "checking" : data ? "up" : "down"}
          </span>
          {label}
        </div>
        <div className="stat-value muted mono">{baseUrl}</div>
      </div>
    </Link>
  );
}

export function Overview() {
  const { settings } = useSettings();

  return (
    <div>
      <PageHeader
        title="EMotorad HRMS"
        description="One place to work across all 11 HR-automation services — hiring, onboarding, document workflows, compliance, and assets. Each card below is a live health check against that service's own backend."
      />
      <div className="stat-grid">
        {SERVICES.map((s) => (
          <ServiceStatCard key={s.key} serviceKey={s.key} label={s.label} baseUrl={settings.baseUrls[s.key]} />
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-pad">
          <h3 style={{ marginBottom: 8 }}>Nothing reachable?</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            None of these 11 services run by default — each is its own Express app under{" "}
            <code>apps/</code> in the EM_HRMS repo. Start the ones you want to use (see each app's own
            README, or the admin-dashboard's README for a "run everything" script), then confirm the
            base URLs on the <Link to="/settings">Settings</Link> page match where they're actually
            listening.
          </p>
        </div>
      </div>
    </div>
  );
}
