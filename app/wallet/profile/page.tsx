"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, LogOut, ShieldCheck } from "lucide-react";

type ProfileData = {
  user: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
    phone: string | null;
    isAdmin: boolean;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/wallet/balance")
      .then((res) => res.json())
      .then(setData);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth");
  };

  const displayName = data
    ? [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || data.user.username || "User"
    : "";

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-24 max-w-md mx-auto">
      <h1 className="text-xl font-bold uppercase tracking-widest text-gold mb-6">Profile</h1>

      {!data ? (
        <Skeleton className="h-40 w-full rounded-2xl bg-card-navy mb-6" />
      ) : (
        <Card className="bg-card-navy border-[#1a3a6e] rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <Avatar className="w-14 h-14 border border-[#1a3a6e]">
              <AvatarImage src={data.user.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-gold/20 text-gold font-semibold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-white">{displayName}</p>
              {data.user.username && <p className="text-sm text-muted-foreground">@{data.user.username}</p>}
            </div>
          </div>

          <Separator className="bg-[#1a3a6e] mb-3" />

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span className="text-white">{data.user.phone || "Not connected"}</span>
          </div>
        </Card>
      )}

      {data?.user.isAdmin && (
        <Link href="/admin/dashboard" className="block mb-4">
          <Card className="bg-card-navy border-gold/40 hover:border-gold transition-colors rounded-xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-gold" />
              <div>
                <p className="font-bold text-gold uppercase text-sm tracking-wide">Admin Panel</p>
                <p className="text-xs text-muted-foreground">Manage users, withdrawals, plans & release conditions</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gold" />
          </Card>
        </Link>
      )}

      <Button
        onClick={handleLogout}
        disabled={loggingOut}
        variant="outline"
        className="w-full border-patriot-red text-patriot-red hover:bg-patriot-red/10 font-bold uppercase tracking-wide"
      >
        <LogOut className="w-4 h-4 mr-2" />
        {loggingOut ? "Logging out..." : "Log Out"}
      </Button>

      <BottomNav />
    </div>
  );
}
