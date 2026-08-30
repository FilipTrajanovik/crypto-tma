import { redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { sql } from "@/lib/db";

export default async function RootPage() {
  const session = await getSession();
  if (session) {
    const rows = await sql`SELECT is_admin, is_super_admin FROM users WHERE id = ${session.userId}`;
    if (rows.length === 0) {
      // The account behind this session was deleted (e.g. by an admin) —
      // drop the stale cookie so the user goes through auth as a fresh signup.
      await clearSessionCookie();
      redirect("/auth");
    }
    const isAdmin = rows[0].is_admin === true || rows[0].is_super_admin === true;
    redirect(isAdmin ? "/admin/dashboard" : "/wallet");
  }
  redirect("/auth");
}
