import { PageHeader, Card, Field, Button } from "../components/ui";
import { useSettings } from "../lib/settings";
import { SERVICES } from "../lib/services";

export function SettingsPage() {
  const { settings, update, updateBaseUrl, reset } = useSettings();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Where this dashboard looks for each backend, and which identity it presents. Stored only in this browser (localStorage) — never sent anywhere but the services below."
      />

      <Card>
        <h3 style={{ marginBottom: 4 }}>Shared auth</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          5 of the 11 services (document-engine, hr-vault, compliance-reminders, asset-management,
          exit-formalities) require a shared <code>x-internal-api-key</code> header — it must match
          that service's own <code>INTERNAL_API_KEY</code> env var.
        </p>
        <Field label="x-internal-api-key">
          <input value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })} />
        </Field>
        <p className="muted" style={{ fontSize: 13 }}>
          HR Vault additionally identifies you as an actor via two headers, used for its access-control
          checks (only the HR role can read/write/list by default).
        </p>
        <div className="field-row">
          <Field label="x-actor-email">
            <input value={settings.actorEmail} onChange={(e) => update({ actorEmail: e.target.value })} />
          </Field>
          <Field label="x-actor-role">
            <select value={settings.actorRole} onChange={(e) => update({ actorRole: e.target.value })}>
              <option value="HR">HR</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="CANDIDATE">CANDIDATE</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginBottom: 12 }}>Service base URLs</h3>
        {SERVICES.map((s) => (
          <Field key={s.key} label={s.label}>
            <input
              value={settings.baseUrls[s.key]}
              onChange={(e) => updateBaseUrl(s.key, e.target.value)}
            />
          </Field>
        ))}
        <Button onClick={reset}>Reset to defaults</Button>
      </Card>
    </div>
  );
}
