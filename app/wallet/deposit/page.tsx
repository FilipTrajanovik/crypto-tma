"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { Copy, Check, TriangleAlert, QrCode } from "lucide-react";

const FALLBACK_BTC = process.env.NEXT_PUBLIC_BTC_ADDRESS || "";
const FALLBACK_ETH = process.env.NEXT_PUBLIC_ETH_ADDRESS || "";

function AddressCard({ label, symbol, address }: { label: string; symbol: string; address: string }) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, { margin: 1, width: 220, color: { dark: "#0a1628", light: "#ffffff" } }).then(setQr);
  }, [address]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.add({ title: "Address copied", type: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="bg-card-navy border-[#1a3a6e] border-t-4 border-t-gold rounded-2xl p-5">
      <p className="text-patriot-red uppercase text-xs tracking-widest font-bold mb-4">{label} Address</p>

      {!address ? (
        <p className="text-sm text-muted-foreground">Not configured yet. Contact support for a deposit address.</p>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`${label} QR code`} className="rounded-xl bg-white p-2 w-[180px] h-[180px]" />
            ) : (
              <div className="w-[180px] h-[180px] rounded-xl bg-white/5 flex flex-col items-center justify-center gap-2">
                <QrCode className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">QR Code</span>
              </div>
            )}
          </div>

          <div className="bg-navy rounded-xl px-3 py-3 mb-3 break-all text-sm text-white font-mono flex items-center gap-2">
            <span className="text-gold">{symbol}</span>
            {address}
          </div>

          <Button onClick={handleCopy} className="w-full bg-gold text-navy font-bold hover:brightness-95">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Address"}
          </Button>
        </>
      )}
    </Card>
  );
}

export default function DepositPage() {
  const [btcAddress, setBtcAddress] = useState(FALLBACK_BTC);
  const [ethAddress, setEthAddress] = useState(FALLBACK_ETH);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.btcAddress) setBtcAddress(data.btcAddress);
        if (data.ethAddress) setEthAddress(data.ethAddress);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Deposit Funds" subtitle="Send crypto to your official wallet address below" />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full rounded-2xl bg-card-navy" />
          <Skeleton className="h-80 w-full rounded-2xl bg-card-navy" />
        </div>
      ) : (
        <div className="space-y-4">
          <AddressCard label="Bitcoin" symbol="₿" address={btcAddress} />
          <AddressCard label="Ethereum" symbol="Ξ" address={ethAddress} />
        </div>
      )}

      <Card className="mt-6 bg-card-navy border-gold/40 rounded-2xl p-4">
        <div className="flex gap-3">
          <TriangleAlert className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            After sending funds, notify your account manager. All deposits are manually verified and credited
            within 24 hours.
          </p>
        </div>
      </Card>
    </div>
  );
}
