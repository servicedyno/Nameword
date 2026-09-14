// One status → colour/label mapping for every table and card in the app.
const TONE_CLS = {
  success: "nw-badge-success",
  accent: "nw-badge-accent",
  danger: "nw-badge-danger",
  neutral: "nw-badge-neutral",
  brand: "nw-badge-brand",
};

const MAP = {
  active: ["success", "Active"],
  running: ["success", "Running"],
  online: ["success", "Online"],
  completed: ["success", "Completed"],
  paid: ["success", "Paid"],
  credited: ["success", "Credited"],
  successful: ["success", "Successful"],
  success: ["success", "Success"],
  upcoming: ["success", "Active"],
  on: ["success", "On"],
  test_mode: ["accent", "Test mode"],
  dry_run: ["accent", "Test mode"],
  confirming: ["accent", "Confirming"],
  detected: ["accent", "Detected"],
  provisioning: ["accent", "Provisioning"],
  creating: ["accent", "Provisioning"],
  starting: ["accent", "Starting"],
  partial: ["accent", "Partial"],
  expiring_soon: ["accent", "Expiring soon"],
  "expiring soon": ["accent", "Expiring soon"],
  "renewal due": ["accent", "Renewal due"],
  "on hold": ["accent", "On hold"],
  pending: ["neutral", "Pending"],
  requested: ["neutral", "Requested"],
  stopped: ["neutral", "Stopped"],
  shutoff: ["neutral", "Stopped"],
  off: ["neutral", "Off"],
  inactive: ["neutral", "Inactive"],
  unknown: ["neutral", "—"],
  failed: ["danger", "Failed"],
  expired: ["danger", "Expired"],
  refunded: ["brand", "Refunded"],
};

export const statusTone = (status) => (MAP[String(status || "").trim().toLowerCase()] || ["neutral"])[0];

export default function StatusBadge({ status, label, className = "", testid }) {
  const key = String(status || "").trim().toLowerCase();
  const [tone, fallback] = MAP[key] || ["neutral", key ? key.replace(/_/g, " ") : "—"];
  return (
    <span className={`${TONE_CLS[tone]} ${className}`} data-testid={testid} data-status={key}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      {label || fallback}
    </span>
  );
}
