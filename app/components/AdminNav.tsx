"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/release", label: "Release" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin");
  };

  return (
    <header className="border-b border-white/10 bg-card sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-5 py-3">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Link href="/wallet" className="text-muted text-sm hover:text-accent transition-colors whitespace-nowrap">
              ← Wallet
            </Link>
            <span className="font-semibold text-accent whitespace-nowrap">Wallet Admin</span>
          </div>
          <button onClick={handleLogout} className="text-sm text-muted hover:text-danger whitespace-nowrap">
            Log Out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto no-scrollbar">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                pathname === link.href ? "bg-accent text-navy font-medium" : "text-muted hover:bg-white/5"
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
