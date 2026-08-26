"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/app/components/BottomNav";

type ProfileData = {
  user: { firstName: string | null; lastName: string | null; username: string | null; avatarUrl: string | null; phone: string | null };
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
    <div className="min-h-screen px-5 pt-6 pb-24">
      <h1 className="text-xl font-semibold mb-6">Profile</h1>

      {data ? (
        <div className="bg-card rounded-2xl p-5 border border-white/5 mb-6">
          <div className="flex items-center gap-3 mb-5">
            {data.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.user.avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{displayName}</p>
              {data.user.username && <p className="text-sm text-muted">@{data.user.username}</p>}
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-t border-white/5 pt-3">
              <span className="text-muted">Phone</span>
              <span>{data.user.phone || "Not connected"}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      )}

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full bg-card hover:bg-white/5 border border-danger/30 text-danger transition-colors font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
      >
        {loggingOut ? "Logging out..." : "Log Out"}
      </button>

      <BottomNav />
    </div>
  );
}
