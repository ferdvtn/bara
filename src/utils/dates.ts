/**
 * Returns today's date in YYYY-MM-DD format in the user's local timezone.
 * Uses 'sv-SE' locale which produces YYYY-MM-DD format natively.
 */
export function getTodayLocal(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/**
 * Returns the date 97 days ago in YYYY-MM-DD format (so today is day 98).
 * Used for the heatmap 98-day query window.
 */
export function get98DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 97);
  return d.toLocaleDateString("sv-SE");
}

/**
 * Returns the date N days ago in YYYY-MM-DD format.
 */
export function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d.toLocaleDateString("sv-SE");
}

/**
 * Formats a YYYY-MM-DD string to a human-readable "DD MMM" format.
 * e.g. "2024-01-15" → "15 Jan"
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/**
 * Returns the day of year (1-365) for today, used for identity text rotation (§7.3).
 */
export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Validates that a string matches YYYY-MM-DD format.
 */
export function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 * @param dateStr YYYY-MM-DD format
 * @param n number of days to add (can be negative)
 * @returns YYYY-MM-DD format
 */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
}

/**
 * Formats a YYYY-MM-DD string to "DD MMM YYYY" format.
 * e.g. "2024-01-15" → "15 Jan 2024"
 */
export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
