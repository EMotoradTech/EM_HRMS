import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "../lib/settings";
import { pingHealth } from "../lib/apiClient";
import { ServiceKey } from "../lib/services";

interface NavItem {
  to: string;
  label: string;
  service?: ServiceKey;
}

const NAV: { section: string; items: NavItem[] }[] = [
  { section: "", items: [{ to: "/", label: "Overview" }] },
  {
    section: "Foundations",
    items: [
      { to: "/documents", label: "Documents & Approvals", service: "documentEngine" },
      { to: "/vault", label: "HR Vault", service: "hrVault" },
      { to: "/compliance", label: "Compliance Reminders", service: "complianceReminders" },
      { to: "/assets", label: "Asset Management", service: "assetManagement" },
      { to: "/exits", label: "Exit Formalities", service: "exitFormalities" },
    ],
  },
  {
    section: "Hiring",
    items: [
      { to: "/resumes", label: "Resume Screening", service: "resumeScreening" },
      { to: "/bgv", label: "BGV Tracking", service: "bgvTracking" },
      { to: "/offers", label: "Offer Letters", service: "offerLetters" },
    ],
  },
  {
    section: "Onboarding",
    items: [
      { to: "/induction", label: "Induction Portal", service: "inductionPortal" },
      { to: "/training", label: "Product Training", service: "productTraining" },
      { to: "/pulse", label: "Pulse Survey", service: "pulseSurvey" },
    ],
  },
];

function HealthDot({ service }: { service?: ServiceKey }) {
  const { settings } = useSettings();
  const baseUrl = service ? settings.baseUrls[service] : undefined;
  const { data } = useQuery({
    queryKey: ["health", baseUrl],
    queryFn: () => pingHealth(baseUrl!),
    enabled: !!baseUrl,
    refetchInterval: 15000,
    retry: false,
  });
  if (!service) return null;
  return <span className={`dot ${data ? "up" : "down"}`} title={data ? "reachable" : "unreachable"} />;
}

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark">EM</div>
        <div>
          <div className="brand-text">EMotorad HRMS</div>
          <div className="brand-sub">internal admin</div>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.section || "root"}>
          {group.section && <div className="sidebar-section-label">{group.section}</div>}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              end={item.to === "/"}
            >
              <HealthDot service={item.service} />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          ⚙ Settings
        </NavLink>
      </div>
    </nav>
  );
}
