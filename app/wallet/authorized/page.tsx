"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, MessageCircle, Search } from "lucide-react";

type Person = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

function openTelegram(username: string) {
  const target = `https://t.me/${username.replace(/^@/, "")}`;
  const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
  if (tg?.WebApp?.openTelegramLink) {
    tg.WebApp.openTelegramLink(target);
  } else {
    window.open(target, "_blank");
  }
}

export default function AuthorizedPersonsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/wallet/authorized?search=${encodeURIComponent(term)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.persons || []))
        .finally(() => {
          setLoading(false);
          setSearched(true);
        });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Authorized Persons" subtitle="Verify who is officially permitted to act on your account" />

      <Card className="bg-card-navy border-[#1a3a6e] border-l-4 border-l-gold rounded-2xl p-5 mb-6">
        <div className="flex gap-3">
          <ShieldCheck className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only the individuals listed here are officially authorized by the organization to assist with your
            account. Search by name to confirm someone&apos;s identity before trusting any instructions they give you.
          </p>
        </div>
      </Card>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, e.g. Martin"
          className="bg-card-navy border-[#1a3a6e] focus-visible:border-gold text-white pl-9"
        />
      </div>

      {loading && <p className="text-muted-foreground text-sm text-center py-6">Searching...</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-6">
          No authorized person matches that name. Double-check the spelling.
        </p>
      )}

      {!loading && !searched && (
        <p className="text-muted-foreground text-xs text-center py-6 uppercase tracking-wide">
          Type at least 2 characters to search
        </p>
      )}

      <div className="space-y-3">
        {results.map((person) => {
          const displayName = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username || "Authorized Person";
          return (
            <Card key={person.id} className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4 flex items-center gap-3">
              <Avatar className="w-11 h-11 border border-[#1a3a6e]">
                <AvatarImage src={person.avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-navy text-gold">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-white truncate">{displayName}</p>
                  <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground">Officially authorized representative</p>
              </div>
              <button
                onClick={() => person.username && openTelegram(person.username)}
                className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg font-bold text-xs uppercase tracking-wide bg-gold text-navy hover:brightness-95 active:scale-95 transition-transform"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Contact
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
