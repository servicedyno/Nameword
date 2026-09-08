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