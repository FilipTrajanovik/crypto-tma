"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

type Order = {
  id: number;
  user_id: number;
  product_name: string;
  list_price: string;
  price: string;
  status: "pending" | "awaiting_payment" | "paid" | "cancelled";
  pay_currency: string | null;
  pay_address: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  telegram_id: string;
  btc_address: string | null;
  eth_address: string | null;
};

type Product = { id: number; name: string; description: string | null; price: string; is_active: boolean; has_image: boolean };

const usd = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const STATUS_STYLE: Record<Order["status"], { label: string; className: string }> = {
  pending: { label: "New", className: "bg-premium/15 text-premium border-premium/30" },
  awaiting_payment: { label: "Awaiting payment", className: "bg-brand/15 text-brand-bright border-brand/30" },
  paid: { label: "Paid", className: "bg-verified/15 text-verified-bright border-verified/30" },
  cancelled: { label: "Cancelled", className: "bg-patriot-red/15 text-patriot-red border-patriot-red/30" },
};

const inputClass = "bg-navy border-line focus-visible:border-brand text-white";

/** Shrinks a photo in the browser so product images stay small in the database. */
async function downscale(file: File, maxSide = 1000): Promise<File> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function AdminShopPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [defaults, setDefaults] = useState({ btc: "", eth: "" });
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Order dialogs
  const [priceOrder, setPriceOrder] = useState<Order | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payCurrency, setPayCurrency] = useState<"BTC" | "ETH">("BTC");
  const [payAddress, setPayAddress] = useState("");
  const [confirm, setConfirm] = useState<{ order: Order; action: "mark_paid" | "cancel" } | null>(null);
  const [saving, setSaving] = useState(false);

  // Product dialog (id null = new)
  const [productDialog, setProductDialog] = useState<{ id: number | null } | null>(null);
  const [pName, setPName] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pFile, setPFile] = useState<File | null>(null);
  const [pRemoveImage, setPRemoveImage] = useState(false);
  const [pHadImage, setPHadImage] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/shop/orders");
    if (res.status === 401) {
      router.replace("/admin");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setDefaults(data.defaults);
      setCanManageProducts(data.canManageProducts === true);
      if (data.canManageProducts) {
        const pRes = await fetch("/api/admin/shop/products");
        if (pRes.ok) setProducts((await pRes.json()).products);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const customers = useMemo(() => {
    const map = new Map<number, { user: Order; orders: Order[] }>();
    for (const o of orders) {
      const entry = map.get(o.user_id);
      if (entry) entry.orders.push(o);
      else map.set(o.user_id, { user: o, orders: [o] });
    }
    // Customers with something to act on first.
    const needsAction = (c: { orders: Order[] }) => c.orders.some((o) => o.status === "pending" || o.status === "awaiting_payment");
    return Array.from(map.values()).sort((a, b) => Number(needsAction(b)) - Number(needsAction(a)));
  }, [orders]);

  const customerName = (o: Order) => [o.first_name, o.last_name].filter(Boolean).join(" ") || (o.username ? `@${o.username}` : "Unnamed");

  const orderAction = async (id: number, payload: Record<string, unknown>, success: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.add({ title: success, type: "success" });
        setPriceOrder(null);
        setPayOrder(null);
        setConfirm(null);
        await load();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.add({ title: body.error || "Something went wrong", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (o: Order) => {
    const currency = o.pay_currency === "ETH" ? "ETH" : "BTC";
    setPayCurrency(currency);
    setPayAddress(o.pay_address || (currency === "BTC" ? o.btc_address || defaults.btc : o.eth_address || defaults.eth));
    setPayOrder(o);
  };

  const pickCurrency = (c: "BTC" | "ETH") => {
    setPayCurrency(c);
    if (payOrder) setPayAddress(c === "BTC" ? payOrder.btc_address || defaults.btc : payOrder.eth_address || defaults.eth);
  };

  const openProduct = (p: Product | null) => {
    setPName(p?.name || "");
    setPDescription(p?.description || "");
    setPPrice(p ? String(Number(p.price)) : "");
    setPFile(null);
    setPRemoveImage(false);
    setPHadImage(p?.has_image === true);
    setProductDialog({ id: p?.id ?? null });
  };

  const saveProduct = async () => {
    if (!productDialog) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set("name", pName);
      form.set("description", pDescription);
      form.set("price", pPrice);
      if (pFile) form.set("image", await downscale(pFile));
      if (pRemoveImage) form.set("removeImage", "1");
      const res = await fetch(productDialog.id ? `/api/admin/shop/products/${productDialog.id}` : "/api/admin/shop/products", {
        method: productDialog.id ? "PATCH" : "POST",
        body: form,
      });
      if (res.ok) {
        toast.add({ title: productDialog.id ? "Product updated" : "Product added", type: "success" });
        setProductDialog(null);
        await load();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.add({ title: body.error || "Could not save the product", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    const form = new FormData();
    form.set("isActive", p.is_active ? "0" : "1");
    const res = await fetch(`/api/admin/shop/products/${p.id}`, { method: "PATCH", body: form });
    if (res.ok) load();
    else toast.add({ title: "Could not update the product", type: "error" });
  };

  const removeProduct = async () => {
    if (!deleteProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/products/${deleteProduct.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.add({ title: "Product deleted", type: "success" });
        setDeleteProduct(null);
        await load();
      } else {
        toast.add({ title: "Could not delete the product", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy">
      <AdminNav />
      <main className="max-w-4xl mx-auto px-5 py-6">
        <h1 className="text-xl font-bold uppercase tracking-widest text-brand mb-5">Shop</h1>

        {canManageProducts && (
          <div className="flex gap-2 mb-5">
            {(["orders", "products"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "default" : "outline"}
                onClick={() => setTab(t)}
                className={`capitalize ${tab === t ? "bg-brand text-navy hover:brightness-95" : "border-line text-muted-foreground"}`}
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl bg-card-navy" />
        ) : tab === "orders" ? (
          customers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">No orders yet.</p>
          ) : (
            <div className="space-y-4">
              {customers.map(({ user, orders: list }) => (
                <Card key={user.user_id} className="bg-card-navy border-line rounded-2xl overflow-hidden p-0 gap-0">
                  <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{customerName(user)}</p>
                      <p className="text-xs text-muted-foreground">{user.username ? `@${user.username}` : user.telegram_id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/users/${user.user_id}`)}
                      className="border-line text-muted-foreground shrink-0"
                    >
                      View customer
                    </Button>
                  </div>
                  <ul className="divide-y divide-line">
                    {list.map((o) => {
                      const style = STATUS_STYLE[o.status];
                      const open = o.status === "pending" || o.status === "awaiting_payment";
                      return (
                        <li key={o.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium">{o.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(o.created_at).toLocaleString()}
                                {Number(o.price) !== Number(o.list_price) && ` · list price ${usd(o.list_price)}`}
                              </p>
                              {o.pay_address && (
                                <p className="text-xs text-muted-foreground mt-1 break-all">
                                  {o.pay_currency}: <span className="font-mono">{o.pay_address}</span>
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-white font-semibold tabular-nums">{usd(o.price)}</p>
                              <Badge variant="outline" className={`mt-1 whitespace-nowrap ${style.className}`}>
                                {style.label}
                              </Badge>
                            </div>
                          </div>
                          {open && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-line text-muted-foreground"
                                onClick={() => {
                                  setPriceValue(String(Number(o.price)));
                                  setPriceOrder(o);
                                }}
                              >
                                Change price
                              </Button>
                              <Button size="sm" variant="outline" className="border-line text-muted-foreground" onClick={() => openPayment(o)}>
                                {o.pay_address ? "Edit payment address" : "Send payment address"}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setConfirm({ order: o, action: "mark_paid" })}
                                className="bg-verified text-navy hover:brightness-110 font-bold uppercase text-xs"
                              >
                                Mark paid
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setConfirm({ order: o, action: "cancel" })}
                                className="bg-patriot-red text-white hover:brightness-95 font-bold uppercase text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div>
            <Button onClick={() => openProduct(null)} className="bg-brand-gradient text-navy font-bold uppercase tracking-wide mb-4">
              Add product
            </Button>
            {products.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">No products yet. Add the first one.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((p) => (
                  <Card key={p.id} className="bg-card-navy border-line rounded-2xl overflow-hidden p-0 gap-0">
                    {p.has_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/shop/products/${p.id}/image`} alt={p.name} className="w-full aspect-[4/3] object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white font-medium">{p.name}</p>
                        {!p.is_active && (
                          <Badge variant="outline" className="bg-white/5 text-muted-foreground border-line whitespace-nowrap">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{p.description}</p>}
                      <p className="text-brand-bright font-semibold mt-2 tabular-nums">{usd(p.price)}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" variant="outline" className="border-line text-muted-foreground" onClick={() => openProduct(p)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-line text-muted-foreground" onClick={() => toggleActive(p)}>
                          {p.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button size="sm" onClick={() => setDeleteProduct(p)} className="bg-patriot-red text-white hover:brightness-95 text-xs">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Change price */}
        <Dialog open={!!priceOrder} onOpenChange={(open) => !open && setPriceOrder(null)}>
          <DialogContent className="bg-card-navy border-line text-white">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide text-brand">Change price</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              {priceOrder && `${priceOrder.product_name} for ${customerName(priceOrder)}. Only this customer's order changes. The customer is notified.`}
            </p>
            <Input type="number" step="0.01" min="0" value={priceValue} onChange={(e) => setPriceValue(e.target.value)} placeholder="Price in USD" className={inputClass} />
            <DialogFooter>
              <Button
                disabled={saving}
                onClick={() => priceOrder && orderAction(priceOrder.id, { action: "set_price", price: priceValue }, "Price updated")}
                className="w-full bg-brand-gradient text-navy font-bold uppercase tracking-wide"
              >
                {saving ? "Saving..." : "Save price"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment address */}
        <Dialog open={!!payOrder} onOpenChange={(open) => !open && setPayOrder(null)}>
          <DialogContent className="bg-card-navy border-line text-white">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide text-brand">Payment address</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              The customer is notified on Telegram and sees the address on their order. Prefilled from this customer&apos;s or the platform deposit address.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["BTC", "ETH"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickCurrency(c)}
                  className={`h-9 rounded-lg text-sm font-semibold ${payCurrency === c ? "bg-brand text-navy" : "bg-navy border border-line text-muted-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Input value={payAddress} onChange={(e) => setPayAddress(e.target.value)} placeholder={`${payCurrency} address`} className={`${inputClass} font-mono`} />
            <DialogFooter>
              <Button
                disabled={saving}
                onClick={() =>
                  payOrder && orderAction(payOrder.id, { action: "request_payment", currency: payCurrency, address: payAddress }, "Payment details sent")
                }
                className="w-full bg-brand-gradient text-navy font-bold uppercase tracking-wide"
              >
                {saving ? "Sending..." : "Save and notify customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark paid / cancel */}
        <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
          <DialogContent className="bg-card-navy border-line text-white">
            <DialogHeader>
              <DialogTitle className={`uppercase tracking-wide ${confirm?.action === "mark_paid" ? "text-verified-bright" : "text-patriot-red"}`}>
                {confirm?.action === "mark_paid" ? "Mark as paid" : "Cancel order"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {confirm &&
                `${confirm.order.product_name} (${usd(confirm.order.price)}) for ${customerName(confirm.order)}. The customer will be notified.`}
            </p>
            <DialogFooter>
              <Button
                disabled={saving}
                onClick={() =>
                  confirm && orderAction(confirm.order.id, { action: confirm.action }, confirm.action === "mark_paid" ? "Order marked as paid" : "Order cancelled")
                }
                className={`w-full font-bold uppercase tracking-wide ${
                  confirm?.action === "mark_paid" ? "bg-verified hover:brightness-110 text-navy" : "bg-patriot-red text-white hover:brightness-95"
                }`}
              >
                {saving ? "Saving..." : confirm?.action === "mark_paid" ? "Confirm paid" : "Cancel order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add / edit product */}
        <Dialog open={!!productDialog} onOpenChange={(open) => !open && setProductDialog(null)}>
          <DialogContent className="bg-card-navy border-line text-white">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide text-brand">{productDialog?.id ? "Edit product" : "Add product"}</DialogTitle>
            </DialogHeader>
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Name" maxLength={120} className={inputClass} />
            <textarea
              value={pDescription}
              onChange={(e) => setPDescription(e.target.value)}
              placeholder="Description"
              rows={4}
              maxLength={2000}
              className={`${inputClass} w-full rounded-lg border px-2.5 py-2 text-sm outline-none`}
            />
            <Input type="number" step="0.01" min="0" value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="Price in USD" className={inputClass} />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Photo</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  setPFile(e.target.files?.[0] || null);
                  setPRemoveImage(false);
                }}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-navy file:font-semibold"
              />
              {pHadImage && !pFile && (
                <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={pRemoveImage} onChange={(e) => setPRemoveImage(e.target.checked)} />
                  Remove the current photo
                </label>
              )}
            </div>
            <DialogFooter>
              <Button disabled={saving} onClick={saveProduct} className="w-full bg-brand-gradient text-navy font-bold uppercase tracking-wide">
                {saving ? "Saving..." : "Save product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete product */}
        <Dialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
          <DialogContent className="bg-card-navy border-line text-white">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide text-patriot-red">Delete product</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {deleteProduct?.name} will be removed from the shop. Existing orders keep their details. To only hide it, use Hide instead.
            </p>
            <DialogFooter>
              <Button disabled={saving} onClick={removeProduct} className="w-full bg-patriot-red text-white font-bold uppercase tracking-wide hover:brightness-95">
                {saving ? "Deleting..." : "Delete product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
