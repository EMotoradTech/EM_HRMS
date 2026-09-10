import { Route, Routes, useLocation } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Overview } from "./pages/Overview";
import { SettingsPage } from "./pages/Settings";
import { DocumentsPage } from "./pages/documents/DocumentsPage";
import { VaultPage } from "./pages/vault/VaultPage";
import { CompliancePage } from "./pages/compliance/CompliancePage";
import { AssetsPage } from "./pages/assets/AssetsPage";
import { ExitsPage } from "./pages/exits/ExitsPage";
import { ResumeScreeningPage } from "./pages/resumes/ResumeScreeningPage";
import { BgvPage } from "./pages/bgv/BgvPage";
import { OffersPage } from "./pages/offers/OffersPage";
import { InductionPage } from "./pages/induction/InductionPage";
import { TrainingPage } from "./pages/training/TrainingPage";
import { PulsePage } from "./pages/pulse/PulsePage";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/documents": "Documents & Approvals",
  "/vault": "HR Vault",
  "/compliance": "Compliance Reminders",
  "/assets": "Asset Management",
  "/exits": "Exit Formalities",
  "/resumes": "Resume Screening",
  "/bgv": "BGV Tracking",
  "/offers": "Offer Letters",
  "/induction": "Induction Portal",
  "/training": "Product Training",
  "/pulse": "Pulse Survey",
  "/settings": "Settings",
};

function Topbar() {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "EMotorad HRMS";
  return (
    <div className="topbar">
      <h1>{title}</h1>
    </div>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/exits" element={<ExitsPage />} />
            <Route path="/resumes" element={<ResumeScreeningPage />} />
            <Route path="/bgv" element={<BgvPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/induction" element={<InductionPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/pulse" element={<PulsePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
