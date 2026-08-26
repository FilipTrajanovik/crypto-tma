"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import ShieldLogo from "@/app/components/ShieldLogo";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.replace("/admin");
  };

  return (
    <header className="border-b border-[#1a3a6e] bg-card-navy sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-5 py-3">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Link href="/wallet" className="text-muted-foreground text-sm hover:text-gold transition-colors whitespace-nowrap">
              ← Wallet
            </Link>
            <div className="flex items-center gap-2">
              <ShieldLogo size={20} />
              <span className="font-bold uppercase tracking-widest text-gold whitespace-nowrap text-sm">Q F S Wallet</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-patriot-red text-white font-bold uppercase tracking-wide">Admin Panel</Badge>
            <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-patriot-red whitespace-nowrap">
              Log Out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto no-scrollbar">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap uppercase tracking-wide font-medium transition-colors ${
                pathname === link.href ? "bg-gold text-navy" : "text-muted-foreground hover:bg-white/5"
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
