"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/wallet", label: "Home", icon: Home },
    { href: "/wallet/history", label: "History", icon: Clock },
    { href: "/wallet/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-navy border-t border-[#1a3a6e] pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 h-full justify-center">
              <Icon className={`w-5 h-5 ${active ? "text-gold" : "text-muted-foreground"}`} strokeWidth={2} />
              <span className={`text-xs uppercase tracking-wide ${active ? "text-gold" : "text-muted-foreground"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
