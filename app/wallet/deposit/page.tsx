"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

const BTC_ADDRESS = process.env.NEXT_PUBLIC_BTC_ADDRESS || "bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const ETH_ADDRESS = process.env.NEXT_PUBLIC_ETH_ADDRESS || "0xE1TH00000000000000000000000000000000";

function AddressCard({ label, symbol, address }: { label: string; symbol: string; address: string }) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(address, { margin: 1, width: 220, color: { dark: "#0a0f1e", light: "#ffffff" } }).then(setQr);
  }, [address]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{symbol}</span>
        <p className="font-semibold">{label} Deposit Address</p>
      </div>

      <div className="flex justify-center mb-4">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`${label} address QR code`} className="rounded-xl bg-white p-2 w-[180px] h-[180px]" />
        ) : (
          <div className="w-[180px] h-[180px] rounded-xl bg-white/5 animate-pulse" />
        )}
      </div>

      <div className="bg-navy rounded-xl px-3 py-3 mb-3 break-all text-xs text-gray-300 font-mono">{address}</div>

      <button
        onClick={handleCopy}
        className="w-full bg-accent hover:bg-accent-dark transition-colors text-navy font-semibold py-2.5 rounded-xl text-sm"
      >
        {copied ? "Copied!" : "Copy Address"}
      </button>
    </div>
  );
}

export default function DepositPage() {
  return (
    <div className="min-h-screen px-5 pt-6 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-muted text-xl leading-none">←</Link>
        <h1 className="text-xl font-semibold">Deposit</h1>
      </div>

      <div className="space-y-4">
        <AddressCard label="Bitcoin" symbol="₿" address={BTC_ADDRESS} />
        <AddressCard label="Ethereum" symbol="Ξ" address={ETH_ADDRESS} />
      </div>

      <div className="mt-6 bg-card border border-white/5 rounded-2xl p-4 text-sm text-muted leading-relaxed">
        After sending, notify your account manager. Deposits are confirmed manually and your balance will be
        updated once the transaction is verified on-chain.
      </div>
    </div>
  );
}
