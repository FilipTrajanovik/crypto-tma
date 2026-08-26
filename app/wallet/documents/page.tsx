"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download } from "lucide-react";

type Doc = {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  note: string | null;
  created_at: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WalletDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/wallet/documents");
    if (res.status === 401) {
      router.replace("/auth");
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents);
    }
  }, [router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Documents" subtitle="Files your account manager has shared with you." />

      {docs === null ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl bg-card-navy" />
        </div>
      ) : docs.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-10">No documents have been shared with you yet.</p>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => {
            const fileUrl = `/api/wallet/documents/${doc.id}/file`;
            const isImage = doc.mime_type.startsWith("image/");
            const isPdf = doc.mime_type === "application/pdf";
            return (
              <Card key={doc.id} className="bg-card-navy border-[#1a3a6e] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={fileUrl}
                    download={doc.file_name}
                    className="shrink-0 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gold hover:brightness-95"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>

                {isImage ? (
                  <a href={fileUrl} target="_blank" rel="noreferrer">
                    <img src={fileUrl} alt={doc.file_name} className="w-full rounded-xl border border-[#1a3a6e] object-contain max-h-72" />
                  </a>
                ) : isPdf ? (
                  <iframe src={fileUrl} className="w-full h-72 rounded-xl border border-[#1a3a6e] bg-white" title={doc.file_name} />
                ) : (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground bg-navy rounded-xl p-3 border border-[#1a3a6e]"
                  >
                    <FileText className="w-4 h-4 text-gold shrink-0" /> Preview not available — tap to open
                  </a>
                )}

                {doc.note && <p className="text-xs text-muted-foreground mt-3">{doc.note}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
