import { getDb } from "./db";

/**
 * Validates a Bearer token by looking it up in the sessions table.
 * Returns true if the token exists, false otherwise.
 */
export async function validateToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT token FROM sessions WHERE token = ?",
      args: [token],
    });
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Creates a new session token and persists it to Turso.
 * Returns the generated token.
 */
export async function createSession(): Promise<string> {
  const token = crypto.randomUUID();
  const db = getDb();
  await db.execute({
    sql: "INSERT INTO sessions (token, created_at) VALUES (?, ?)",
    args: [token, new Date().toISOString()],
  });
  return token;
}

/**
 * Deletes a session token (logout).
 */
export async function deleteSession(token: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: "DELETE FROM sessions WHERE token = ?",
    args: [token],
  });
}

/**
 * Extracts and validates the Bearer token from an Authorization header.
 * Returns the token string if valid, null otherwise.
 */
export async function getValidatedToken(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const valid = await validateToken(token);
  return valid ? token : null;
}
