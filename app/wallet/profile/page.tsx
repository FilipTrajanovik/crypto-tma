"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { ChevronRight, LogOut, ShieldCheck, Pencil } from "lucide-react";

type ProfileData = {
  user: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    avatarUrl: string | null;
    phone: string | null;
    email: string | null;
    homeAddress: string | null;
    isAdmin: boolean;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [homeAddress, setHomeAddress] = useState("");

  const load = () =>
    fetch("/api/wallet/balance")
      .then((res) => res.json())
      .then((json: ProfileData) => {
        setData(json);
        setFirstName(json.user.firstName || "");
        setLastName(json.user.lastName || "");
        setPhone(json.user.phone || "");
        setEmail(json.user.email || "");
        setHomeAddress(json.user.homeAddress || "");
      });

  useEffect(() => {
    load();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.add({ title: "First name is required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/wallet/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          homeAddress: homeAddress.trim() || null,
        }),
      });
      if (res.ok) {
        toast.add({ title: "Profile updated", type: "success" });
        setEditing(false);
        await load();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.add({ title: errData.error || "Failed to update profile", type: "error" });
      }
    } finally {
      setSaving(false);
    }
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
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
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
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-gold text-xs font-bold uppercase tracking-wide flex items-center gap-1 shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          <Separator className="bg-[#1a3a6e] mb-4" />

          {editing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Phone (optional)</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Email (optional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Home Address (optional)</Label>
                <Input
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="Street, City, Country"
                  className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setFirstName(data.user.firstName || "");
                    setLastName(data.user.lastName || "");
                    setPhone(data.user.phone || "");
                    setEmail(data.user.email || "");
                    setHomeAddress(data.user.homeAddress || "");
                  }}
                  className="flex-1 border-[#1a3a6e] text-muted-foreground font-bold uppercase tracking-wide"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-white">{data.user.phone || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-white">{data.user.email || "Not set"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Home Address</span>
                <span className="text-white text-right">{data.user.homeAddress || "Not set"}</span>
              </div>
            </div>
          )}
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
