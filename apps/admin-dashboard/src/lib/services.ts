// The 11 backend apps this dashboard talks to, and the local port each one
// listens on when run per this repo's README (see apps/admin-dashboard/README.md
// for the full "run everything" instructions — each app was built standalone,
// so their individual default ports collide with each other; this map is the
// dashboard's own recommended non-colliding local layout).
export type ServiceKey =
  | "documentEngine"
  | "hrVault"
  | "complianceReminders"
  | "assetManagement"
  | "exitFormalities"
  | "resumeScreening"
  | "bgvTracking"
  | "offerLetters"
  | "inductionPortal"
  | "productTraining"
  | "pulseSurvey";

export interface ServiceDefinition {
  key: ServiceKey;
  label: string;
  defaultPort: number;
  // Whether this service checks the shared x-internal-api-key header.
  requiresApiKey: boolean;
}

export const SERVICES: ServiceDefinition[] = [
  { key: "documentEngine", label: "Document Engine", defaultPort: 4001, requiresApiKey: true },
  { key: "hrVault", label: "HR Vault", defaultPort: 4002, requiresApiKey: true },
  { key: "complianceReminders", label: "Compliance Reminders", defaultPort: 4003, requiresApiKey: true },
  { key: "assetManagement", label: "Asset Management", defaultPort: 4004, requiresApiKey: true },
  { key: "exitFormalities", label: "Exit Formalities", defaultPort: 4005, requiresApiKey: true },
  { key: "resumeScreening", label: "Resume Screening", defaultPort: 4006, requiresApiKey: false },
  { key: "bgvTracking", label: "BGV Tracking", defaultPort: 4007, requiresApiKey: false },
  { key: "offerLetters", label: "Offer Letters", defaultPort: 4008, requiresApiKey: false },
  { key: "inductionPortal", label: "Induction Portal", defaultPort: 4009, requiresApiKey: false },
  { key: "productTraining", label: "Product Training", defaultPort: 4010, requiresApiKey: false },
  { key: "pulseSurvey", label: "Pulse Survey", defaultPort: 4011, requiresApiKey: false },
];

export function defaultBaseUrl(defaultPort: number): string {
  return `http://localhost:${defaultPort}`;
}
