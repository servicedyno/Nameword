// Region codes stay functional (EU/SG) under the hood — sent to the reseller API —
// but are masked with generic, privacy-first labels everywhere in the UI.
export const REGION_CODES = ["EU", "SG"];

export const REGION_LABELS = {
  EU: "Privacy Jurisdiction A",
  SG: "Privacy Jurisdiction B",
};

export const regionLabel = (code) => REGION_LABELS[String(code || "").toUpperCase()] || code || "";
