import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SERVICES, ServiceKey, defaultBaseUrl } from "./services";

export interface Settings {
  baseUrls: Record<ServiceKey, string>;
  apiKey: string;
  actorEmail: string;
  actorRole: string;
}

const STORAGE_KEY = "em-hrms-dashboard-settings";

function defaultSettings(): Settings {
  const baseUrls = Object.fromEntries(
    SERVICES.map((s) => [s.key, defaultBaseUrl(s.defaultPort)])
  ) as Record<ServiceKey, string>;
  return {
    baseUrls,
    apiKey: "dev-local-shared-secret",
    actorEmail: "hr@emotorad.com",
    actorRole: "HR",
  };
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    // Merge over defaults so a new service added later still gets a sane URL
    // even if it's missing from an older saved blob.
    return { ...defaultSettings(), ...parsed, baseUrls: { ...defaultSettings().baseUrls, ...parsed.baseUrls } };
  } catch {
    return defaultSettings();
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  updateBaseUrl: (key: ServiceKey, url: string) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing / storage disabled — settings just won't persist across reloads.
    }
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const updateBaseUrl = (key: ServiceKey, url: string) =>
    setSettings((s) => ({ ...s, baseUrls: { ...s.baseUrls, [key]: url } }));
  const reset = () => setSettings(defaultSettings());

  return (
    <SettingsContext.Provider value={{ settings, update, updateBaseUrl, reset }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
