import { ReactElement, ReactNode, cloneElement, isValidElement, useId } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="card">
      <div className="card-pad">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>;
}

export function Spinner() {
  return <span className="muted">Loading…</span>;
}

// Loose status -> color mapping shared across every module's status values
// (each app has its own status enum, but the tone families repeat).
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info"> = {
  APPROVED: "success",
  VERIFIED: "success",
  COMPLETE: "success",
  COMPLETED: "success",
  SIGNED: "success",
  FILED: "success",
  SENT: "info",
  ONBOARDING_READY: "success",
  ISSUED: "info",
  RETURNED: "success",
  IN_STOCK: "info",
  STARTED: "info",
  IN_PROGRESS: "warning",
  PENDING: "warning",
  PENDING_APPROVAL: "warning",
  NOT_STARTED: "warning",
  INITIATED: "warning",
  DOCUMENTS_GENERATED: "warning",
  APPROVALS_CLEARED: "warning",
  ASSETS_CLEARED: "warning",
  REJECTED: "danger",
  FLAGGED: "danger",
  FAILED: "danger",
  LOST: "danger",
  BLOCKED: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? undefined;
  return <span className={`badge ${tone ?? ""}`}>{status.replaceAll("_", " ")}</span>;
}

export function Button({
  children,
  onClick,
  variant = "default",
  disabled,
  type = "button",
  small,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  small?: boolean;
}) {
  const cls = ["btn", variant !== "default" ? variant : "", small ? "small" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = "Nothing here yet.",
}: {
  columns: { header: string; render: (row: T) => ReactNode }[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.header}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className={onRowClick ? "clickable" : ""}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((c) => (
              <td key={c.header}>{c.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
