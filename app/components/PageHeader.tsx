"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({ title, subtitle, backHref = "/wallet" }: { title: string; subtitle?: string; backHref?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <Link href={backHref} className="text-gold mt-1 shrink-0">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-gold-gradient">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}
