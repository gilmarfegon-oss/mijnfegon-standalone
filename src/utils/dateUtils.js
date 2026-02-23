/**
 * Format a Firestore Timestamp, ISO string, or Date to a Dutch locale date string.
 * Returns "-" for missing/invalid values.
 */
export function formatDate(dateValue) {
  if (!dateValue) return "-";
  if (dateValue.toDate) return dateValue.toDate().toLocaleDateString("nl-NL");
  if (typeof dateValue === "string") {
    const d = new Date(dateValue);
    if (!isNaN(d)) return d.toLocaleDateString("nl-NL");
    return dateValue;
  }
  return "-";
}
