"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ShieldLogo from "@/app/components/ShieldLogo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid password");
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy relative flex items-center justify-center px-6">
      <div className="absolute inset-0 star-bg pointer-events-none" />
      <Card className="relative w-full max-w-sm bg-card-navy border-[#1a3a6e] border-t-4 border-t-gold rounded-2xl p-6">
        <div className="flex justify-center mb-4">
          <ShieldLogo size={44} />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest text-gold text-center mb-1">Admin Panel</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Sign in to manage the Q F S Wallet platform.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Password</Label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-navy border-[#1a3a6e] focus-visible:border-gold text-white"
            />
          </div>

          {error && <p className="text-patriot-red text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy font-bold uppercase tracking-wide hover:brightness-95 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
