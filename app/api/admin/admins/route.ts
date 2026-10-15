import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminIdentity } from "@/lib/auth";
import { ALL_PERMISSIONS, resolvePermissions } from "@/lib/permissions";

export async function GET() {
  const identity = await getAdminIdentity();
  if (!identity.isAdmin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!identity.isSuperAdmin) {
    return NextResponse.json({ error: "Super-admin access required" }, { status: 403 });
  }

  // Falls back to no permissions column if the migration has not been run yet.
  const rows = await sql`
    SELECT u.id, u.first_name, u.last_name, u.username, u.is_admin, u.is_super_admin, u.permissions,
           (SELECT COUNT(*)::int FROM users c WHERE c.assigned_admin_id = u.id) AS claimed_users
    FROM users u
    WHERE u.is_admin = true OR u.is_super_admin = true
    ORDER BY u.first_name ASC
  `.catch(
    () => sql`
      SELECT u.id, u.first_name, u.last_name, u.username, u.is_admin, u.is_super_admin,
             (SELECT COUNT(*)::int FROM users c WHERE c.assigned_admin_id = u.id) AS claimed_users
      FROM users u
      WHERE u.is_admin = true OR u.is_super_admin = true
      ORDER BY u.first_name ASC
    `
  );

  const admins = rows.map((a) => ({
    id: a.id,
    first_name: a.first_name,
    last_name: a.last_name,
    username: a.username,
    is_admin: a.is_admin,
    is_super_admin: a.is_super_admin,
    claimed_users: a.claimed_users,
    permissions: a.is_super_admin ? resolvePermissions(a.permissions) : [],
  }));

  return NextResponse.json({ admins, isOwner: identity.isOwner });
}

/**
 * Owner-only: promote/demote an admin to super-admin and set which
 * permissions a super-admin holds. Body: { userId, isSuperAdmin?, permissions? }.
 */
export async function PATCH(req: NextRequest) {
  const identity = await getAdminIdentity();
  if (!identity.isOwner) {
    return NextResponse.json({ error: "Only the owner can manage super-admins" }, { status: 403 });
  }

  const body = await req.json();
  const userId = Number(body?.userId);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const existing = await sql`SELECT id, is_admin, is_super_admin FROM users WHERE id = ${userId}`;
  if (existing.length === 0 || !(existing[0].is_admin || existing[0].is_super_admin)) {
    return NextResponse.json({ error: "Not an admin" }, { status: 400 });
  }

  if (typeof body.isSuperAdmin === "boolean") {
    // Newly promoted super-admins start with no extra rights until the owner grants them.
    await sql`
      UPDATE users SET
        is_super_admin = ${body.isSuperAdmin},
        permissions = CASE
          WHEN ${body.isSuperAdmin} AND NOT is_super_admin THEN '[]'::jsonb
          WHEN NOT ${body.isSuperAdmin} THEN NULL
          ELSE permissions
        END
      WHERE id = ${userId}
    `;
  }

  if (Array.isArray(body.permissions)) {
    const permissions = ALL_PERMISSIONS.filter((k) => body.permissions.includes(k));
    await sql`UPDATE users SET permissions = ${JSON.stringify(permissions)}::jsonb WHERE id = ${userId} AND is_super_admin = true`;
  }

  return NextResponse.json({ success: true });
}
