/**
 * Returns inline style object for an order status badge.
 * Used in MijnBestellingen and AdminBestellingen.
 */
export function getStatusStyle(status) {
  switch (status) {
    case "Verzonden": return { background: "#e6fffa", color: "#2c7a7b", border: "1px solid #b2f5ea" };
    case "Nieuw": return { background: "#fff5f5", color: "#c53030", border: "1px solid #feb2b2" };
    case "In behandeling": return { background: "#ebf8ff", color: "#2b6cb0", border: "1px solid #bee3f8" };
    default: return { background: "#f7fafc", color: "#4a5568", border: "1px solid #edf2f7" };
  }
}

/**
 * Maps a Firestore registration status code to a Dutch display label.
 */
export function getRegistrationStatusLabel(status) {
  switch (status) {
    case "approved": return "Goedgekeurd";
    case "pending": return "In Behandeling";
    case "rejected": return "Afgekeurd";
    default: return status ?? "-";
  }
}

/**
 * Returns inline style object for a registration status badge.
 */
export function getRegistrationStatusStyle(status) {
  switch (status) {
    case "approved": return { backgroundColor: "#e5ffe8", color: "#0a7a26" };
    case "rejected": return { backgroundColor: "#ffe5e5", color: "#c62828" };
    default: return { backgroundColor: "#fff4e5", color: "#e65100" };
  }
}
