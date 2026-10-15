"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";

type AdminRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  claimed_users: number;
  permissions: string[];
};

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string[]>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.status === 403) {
      router.replace("/admin/dashboard");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins);
      setIsOwner(data.isOwner);
      setDrafts({});
    } else {
      toast.add({ title: "Could not load admins", type: "error" });
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (userId: number, body: object, successTitle: string) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      if (res.ok) {
        toast.add({ title: successTitle, type: "success" });
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.add({ title: data.error || "Something went wrong", type: "error" });
      }
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (a: AdminRow, key: string) => {
    const current = drafts[a.id] ?? a.permissions;
    setDrafts({ ...drafts, [a.id]: current.includes(key) ? current.filter((k) => k !== key) : [...current, key] });
  };

  const resetDraft = (id: number) => {
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-5xl mx-auto px-4 sm:px-5 py-4 sm:py-6">
        <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-white mb-1">Admins</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isOwner
            ? "Promote an admin to super-admin and choose exactly what they can do. A super-admin can always see every user; the permissions below limit what they can change."
            : "Only the owner can change roles and permissions."}
        </p>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl bg-card-navy" />
        ) : (
          <div className="space-y-3">
            {admins.map((a) => {
              const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.username || `Admin #${a.id}`;
              const current = drafts[a.id] ?? a.permissions;
              const dirty = drafts[a.id] !== undefined;
              return (
                <Card key={a.id} className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.username ? `@${a.username} · ` : ""}
                        {a.claimed_users} claimed user{a.claimed_users === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={a.is_super_admin ? "bg-patriot-red/15 text-patriot-red border-patriot-red/30" : "bg-gold/15 text-gold border-gold/30"}
                      >
                        {a.is_super_admin ? "Super Admin" : "Admin"}
                      </Badge>
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === a.id}
                          onClick={() => patch(a.id, { isSuperAdmin: !a.is_super_admin }, a.is_super_admin ? "Demoted to admin" : "Promoted to super admin")}
                          className="border-gold text-gold hover:bg-gold/10 h-10 sm:h-8"
                        >
                          {a.is_super_admin ? "Demote" : "Make super admin"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {a.is_super_admin && (
                    <div className="mt-4 border-t border-[#1a3a6e] pt-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Permissions</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERMISSIONS.map((p) => (
                          <label
                            key={p.key}
                            className={`flex items-start gap-3 rounded-xl bg-navy p-3 ${isOwner ? "cursor-pointer" : "opacity-80"}`}
                          >
                            <input
                              type="checkbox"
                              checked={current.includes(p.key)}
                              disabled={!isOwner}
                              onChange={() => toggle(a, p.key)}
                              className="mt-0.5 h-5 w-5 accent-[#d4af37] shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm text-white">{p.label}</span>
                              <span className="block text-xs text-muted-foreground">{p.hint}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {isOwner && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            disabled={!dirty || busyId === a.id}
                            onClick={() => patch(a.id, { permissions: current }, "Permissions saved")}
                            className="bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60 h-11 sm:h-9 flex-1 sm:flex-none"
                          >
                            Save permissions
                          </Button>
                          {dirty && (
                            <Button
                              variant="outline"
                              onClick={() => resetDraft(a.id)}
                              className="h-11 sm:h-9 border-[#1a3a6e] text-muted-foreground"
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {admins.length === 0 && <p className="text-center text-muted-foreground py-8">No admins yet.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
