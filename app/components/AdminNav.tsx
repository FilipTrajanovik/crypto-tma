"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import ShieldLogo from "@/app/components/ShieldLogo";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/settings", label: "Settings" },
];
const adminsLink = { href: "/admin/admins", label: "Admins" };

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/whoami")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsSuperAdmin(d?.isSuperAdmin === true))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin");
  };

  return (
    <header className="border-b border-line bg-card-navy sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/wallet" className="text-muted-foreground text-sm hover:text-brand transition-colors whitespace-nowrap">
              ← Wallet
            </Link>
            <div className="flex items-center gap-2">
              <ShieldLogo size={20} />
              <span className="font-bold uppercase tracking-wider sm:tracking-widest text-brand whitespace-nowrap text-xs sm:text-sm">Q F S Wallet</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge className="hidden sm:inline-flex bg-patriot-red text-white font-bold uppercase tracking-wide">Admin Panel</Badge>
            <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-patriot-red whitespace-nowrap">
              Log Out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
          {(isSuperAdmin ? [...links, adminsLink] : links).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap flex-1 sm:flex-none text-center uppercase tracking-wide font-medium transition-colors ${
                pathname === link.href ? "bg-brand text-navy" : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
