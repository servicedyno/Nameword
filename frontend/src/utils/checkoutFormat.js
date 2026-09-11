export const money = (n) =>
  n === null || n === undefined || isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(2)}`;

export const durationLabel = (days) =>
  !days
    ? ""
    : days % 365 === 0
    ? `${days / 365} year${days > 365 ? "s" : ""}`
    : days % 30 === 0
    ? `${days / 30} month${days > 30 ? "s" : ""}`
    : `${days} days`;
