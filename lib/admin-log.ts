import { sql } from "@/lib/db";
import type { AdminIdentity } from "@/lib/auth";

// Audit trail of what admins do. Logging must never break the action being
// logged, so every function here swallows its own errors.

let tableReady: Promise<void> | null = null;

/** Creates the table on first use so no manual migration is needed. */
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id SERIAL PRIMARY KEY,
          actor_user_id INTEGER,
          actor_name TEXT NOT NULL,
          actor_role TEXT NOT NULL,
          action TEXT NOT NULL,
          target_user_id INTEGER,
          target_name TEXT,
          details TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_admin_logs_actor ON admin_logs(actor_user_id)`;
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

function displayName(row: { first_name?: string | null; last_name?: string | null; username?: string | null } | undefined, fallback: string) {
  if (!row) return fallback;
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || (row.username ? `@${row.username}` : fallback);
}

export type LogInput = {
  targetUserId?: number | null;
  details?: string | null;
};

export async function logAdminAction(identity: AdminIdentity, action: string, input: LogInput = {}) {
  try {
    await ensureTable();

    let actorName = "Owner";
    let role = "owner";
    if (!identity.isOwner) {
      role = identity.isSuperAdmin ? "super_admin" : "admin";
      const actor = identity.userId
        ? (await sql`SELECT first_name, last_name, username FROM users WHERE id = ${identity.userId}`)[0]
        : undefined;
      actorName = displayName(actor, `Admin #${identity.userId ?? "?"}`);
    }

    let targetName: string | null = null;
    if (input.targetUserId) {
      const target = (await sql`SELECT first_name, last_name, username FROM users WHERE id = ${input.targetUserId}`)[0];
      targetName = displayName(target, `User #${input.targetUserId}`);
    }

    await sql`
      INSERT INTO admin_logs (actor_user_id, actor_name, actor_role, action, target_user_id, target_name, details)
      VALUES (${identity.userId}, ${actorName}, ${role}, ${action}, ${input.targetUserId ?? null}, ${targetName}, ${input.details ? input.details.slice(0, 500) : null})
    `;
  } catch (err) {
    console.error("Failed to write admin log", err);
  }
}

export type LogRow = {
  id: number;
  actor_user_id: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  target_user_id: number | null;
  target_name: string | null;
  details: string | null;
  created_at: string;
};

export async function listAdminLogs(opts: { actorId?: number | "owner" | null; q?: string; limit: number; offset: number }) {
  await ensureTable();
  const q = opts.q ? `%${opts.q.replace(/[%_]/g, "\\$&")}%` : null;
  const actorId = typeof opts.actorId === "number" ? opts.actorId : null;
  const ownerOnly = opts.actorId === "owner";

  const rows = (await sql`
    SELECT id, actor_user_id, actor_name, actor_role, action, target_user_id, target_name, details, created_at
    FROM admin_logs
    WHERE (${actorId}::int IS NULL OR actor_user_id = ${actorId})
      AND (NOT ${ownerOnly} OR actor_role = 'owner')
      AND (${q}::text IS NULL OR actor_name ILIKE ${q} OR action ILIKE ${q} OR COALESCE(target_name, '') ILIKE ${q} OR COALESCE(details, '') ILIKE ${q})
    ORDER BY created_at DESC, id DESC
    LIMIT ${opts.limit + 1} OFFSET ${opts.offset}
  `) as LogRow[];

  return { logs: rows.slice(0, opts.limit), hasMore: rows.length > opts.limit };
}

/** Everyone who appears in the log, for the filter dropdown. */
export async function listLogActors() {
  await ensureTable();
  return (await sql`
    SELECT actor_user_id, MAX(actor_name) AS actor_name, MAX(actor_role) AS actor_role, COUNT(*)::int AS entries
    FROM admin_logs
    GROUP BY actor_user_id, CASE WHEN actor_role = 'owner' THEN 'owner' ELSE 'user' END
    ORDER BY MAX(created_at) DESC
  `) as { actor_user_id: number | null; actor_name: string; actor_role: string; entries: number }[];
}
