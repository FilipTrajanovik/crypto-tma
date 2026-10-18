"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { href: "/wallet", label: "Home", icon: Home },
    { href: "/wallet/profile", label: "Profile", icon: User },
  ];

  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.href === pathname)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-navy-deep/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)] z-50">
      <div className="relative flex justify-around items-center h-16 max-w-md mx-auto">
        <span
          className="absolute top-1.5 h-[3px] w-6 rounded-full bg-brand-gradient shadow-[0_0_10px_rgba(22,139,255,0.6)] transition-transform duration-300 ease-[cubic-bezier(.65,0,.35,1)]"
          style={{ left: `calc(${activeIndex} * (100% / 2) + (100% / 2 - 1.5rem) / 2)` }}
        />
        {items.map(({ href, label, icon: Icon }, i) => {
          const active = i === activeIndex && pathname === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 h-full justify-center min-h-14">
              <Icon
                className={`w-5 h-5 transition-all duration-200 ${
                  active ? "text-brand-bright -translate-y-0.5 drop-shadow-[0_0_6px_rgba(22,139,255,0.6)]" : "text-muted-foreground"
                }`}
                strokeWidth={2}
              />
              <span
                className={`text-[11px] font-medium uppercase tracking-wider transition-colors duration-200 ${
                  active ? "text-brand-bright" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
