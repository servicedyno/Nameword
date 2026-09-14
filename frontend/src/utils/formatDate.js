import moment from "moment";

/**
 * Format a date using moment.js
 * @param {string|Date|number} date - The date value to format
 * @param {string} format - Optional format (default: "YYYY-MM-DD")
 * @returns {string} formatted date
 */
export const formatDate = (date, format = "YYYY-MM-DD") => {
  if (!date) return "";
  const parsed = moment.utc(date);
  if (!parsed.isValid()) return "";
  return parsed.format(format);
};


// Locale-aware display helpers. Never leak "Invalid Date" into the UI.
const parse = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

export const fmtDate = (d, opts = { year: "numeric", month: "short", day: "numeric" }) => {
  const dt = parse(d);
  return dt ? dt.toLocaleDateString(undefined, opts) : "—";
};

export const fmtDateTime = (d) => {
  const dt = parse(d);
  return dt ? dt.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
};

export const separateDateAndTime = (date) => {
  if(!date) return { date: "", time : ""};

  // Format date and time separately
  const parsed = moment.utc(date);
  if (!parsed.isValid()) {
    return { date: "", time: "" };
  }
  const currDate = parsed.format("YYYY-MM-DD"); // → "2025-11-08"
  const time = parsed.format("hh:mm:ss");

  return { date: currDate , time }
}