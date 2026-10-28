"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { ShopIcon } from "@/app/components/ActionIcons";
import Link from "next/link";
import { Copy, Loader2, Lock, MessageCircle, ShoppingBag } from "lucide-react";

type Product = { id: number; name: string; description: string | null; price: string; has_image: boolean };

type Order = {
  id: number;
  product_id: number | null;
  product_name: string;
  list_price: string;
  price: string;
  status: "pending" | "awaiting_payment" | "paid" | "cancelled";
  pay_currency: string | null;
  pay_address: string | null;
  created_at: string;
  has_image: boolean;
};

const usd = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const STATUS_STYLE: Record<Order["status"], { label: string; className: string }> = {
  pending: { label: "Awaiting review", className: "bg-premium/15 text-premium border-premium/30" },
  awaiting_payment: { label: "Awaiting payment", className: "bg-brand/15 text-brand-bright border-brand/30" },
  paid: { label: "Paid", className: "bg-verified/15 text-verified-bright border-verified/30" },
  cancelled: { label: "Cancelled", className: "bg-patriot-red/15 text-patriot-red border-patriot-red/30" },
};

export default function ShopPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [supportContact, setSupportContact] = useState<string | null>(null);
  const [buying, setBuying] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pRes, oRes] = await Promise.all([fetch("/api/shop/products"), fetch("/api/shop/orders")]);
      if (pRes.status === 401 || oRes.status === 401) {
        router.replace("/auth");
        return;
      }
      if (pRes.status === 403 || oRes.status === 403) {
        const body = await pRes.json().catch(() => ({}));
        if (body?.code === "release_required") {
          setLocked(true);
          return;
        }
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setProducts(data.products);
        setSupportContact(data.supportContact || null);
      }
      if (oRes.ok) setOrders((await oRes.json()).orders);
    } catch {
      toast.add({ title: "No connection. Check your internet and try again.", type: "error" });
    }
  }, [router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleBuy = async (product: Product) => {
    if (buying !== null) return;
    setBuying(product.id);
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.ok) {
        toast.add({ title: "Order sent. Your account manager has been notified.", type: "success" });
        await load();
        setTab("orders");
      } else {
        const body = await res.json().catch(() => ({}));
        if (body?.code === "release_required") setLocked(true);
        toast.add({ title: body.error || "Could not place the order. Try again.", type: "error" });
      }
    } finally {
      setBuying(null);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.add({ title: "Address copied", type: "success" });
    } catch {
      toast.add({ title: "Could not copy. Select the address and copy it manually.", type: "error" });
    }
  };

  const handleContactSupport = () => {
    if (!supportContact) return;
    const target = supportContact.startsWith("http") ? supportContact : `https://t.me/${supportContact.replace(/^@/, "")}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
    if (tg?.WebApp?.openTelegramLink) {
      tg.WebApp.openTelegramLink(target);
    } else {
      window.open(target, "_blank");
    }
  };

  if (locked) {
    return (
      <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
        <PageHeader title="Shop" />
        <Card className="bg-card-gradient-red border-line border-l-4 border-l-patriot-red rounded-2xl p-5 gap-0">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-patriot-red-bright shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              You need to settle your release fee first to use the Shop.
            </p>
          </div>
          <Link
            href="/wallet/release"
            className="mt-4 bg-brand-gradient shadow-brand-glow h-10 rounded-xl text-navy text-sm font-bold uppercase tracking-wide flex items-center justify-center"
          >
            Go to Release Funds
          </Link>
        </Card>
      </div>
    );
  }

  const openOrders = orders?.filter((o) => o.status === "awaiting_payment").length ?? 0;

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Shop" subtitle="Tap Buy now and your account manager will take care of the rest." />

      <div className="grid grid-cols-2 gap-2 mb-5">
        {(["products", "orders"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`h-10 rounded-xl text-sm font-semibold transition-colors ${
              tab === t ? "bg-brand text-navy" : "bg-card-navy border border-line text-muted-foreground"
            }`}
          >
            {t === "products" ? "Products" : "My Orders"}
            {t === "orders" && openOrders > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-patriot-red text-white text-[11px]">
                {openOrders}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "products" &&
        (products === null ? (
          <div className="space-y-4">
            {[0, 1].map((n) => (
              <Skeleton key={n} className="h-72 w-full rounded-2xl bg-card-navy" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState title="No products yet" text="New products will appear here." />
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <Card key={p.id} className="bg-card-gradient border-line rounded-2xl overflow-hidden p-0 gap-0">
                {p.has_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/shop/products/${p.id}/image`} alt={p.name} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] flex items-center justify-center bg-navy-deep">
                    <ShopIcon className="w-12 h-12 text-muted-foreground/60" />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-display font-semibold text-white">{p.name}</p>
                  {p.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{p.description}</p>}
                  <div className="flex items-center justify-between gap-3 mt-4">
                    <p className="font-display text-xl font-semibold text-brand-gradient">{usd(p.price)}</p>
                    <button
                      type="button"
                      onClick={() => handleBuy(p)}
                      disabled={buying !== null}
                      className="bg-brand-gradient shadow-brand-glow h-10 px-5 rounded-xl text-navy text-sm font-bold uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-60 flex items-center gap-2"
                    >
                      {buying === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                      Buy now
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "orders" &&
        (orders === null ? (
          <div className="space-y-4">
            {[0, 1].map((n) => (
              <Skeleton key={n} className="h-28 w-full rounded-2xl bg-card-navy" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet" text="Orders you place will appear here." />
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const style = STATUS_STYLE[o.status];
              const changed = Number(o.price) !== Number(o.list_price);
              return (
                <Card key={o.id} className="bg-card-gradient border-line rounded-2xl p-4 gap-0">
                  <div className="flex gap-3">
                    {o.has_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/shop/products/${o.product_id}/image`} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="graphite-chip flex items-center justify-center w-14 h-14 rounded-xl shrink-0">
                        <ShopIcon className="w-6 h-6" />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-white truncate">{o.product_name}</p>
                        <Badge variant="outline" className={`whitespace-nowrap ${style.className}`}>
                          {style.label}
                        </Badge>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <p className="font-display text-lg font-semibold text-brand-gradient">{usd(o.price)}</p>
                        {changed && <p className="text-xs text-muted-foreground line-through">{usd(o.list_price)}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {o.status === "pending" && (
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Your account manager will confirm the price and send payment details. You can also contact them below to pay.
                    </p>
                  )}

                  {o.status === "awaiting_payment" && o.pay_address && (
                    <div className="mt-3 rounded-xl bg-navy border border-line p-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Send {usd(o.price)} in {o.pay_currency} to</p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 min-w-0 text-xs font-mono text-white break-all">{o.pay_address}</p>
                        <button
                          type="button"
                          onClick={() => handleCopy(o.pay_address!)}
                          aria-label="Copy address"
                          className="graphite-chip flex items-center justify-center w-9 h-9 rounded-full text-brand-bright shrink-0 active:scale-95 transition-transform"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {(o.status === "pending" || o.status === "awaiting_payment") && (
                    <button
                      type="button"
                      onClick={handleContactSupport}
                      disabled={!supportContact}
                      className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-brand-bright hover:bg-white/[0.06] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact Support
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        ))}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center border-t border-line/60">
      <span className="graphite-chip flex items-center justify-center w-12 h-12 rounded-full">
        <ShopIcon className="w-5 h-5" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-[240px]">{text}</p>
    </div>
  );
}
