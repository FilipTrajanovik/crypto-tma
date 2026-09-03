import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export default async function RootPage() {
  const session = await getSession();
  if (session) {
    const rows = await sql`SELECT is_admin, is_super_admin FROM users WHERE id = ${session.userId}`;
    if (rows.length === 0) {
      // The account behind this session was deleted (e.g. by an admin).
      // We can't clear the cookie here (page render can't mutate cookies);
      // it's stale and will be replaced on the next successful auth.
      redirect("/auth");
    }
    const isAdmin = rows[0].is_admin === true || rows[0].is_super_admin === true;
    redirect(isAdmin ? "/admin/dashboard" : "/wallet");
  }
  redirect("/auth");
}
