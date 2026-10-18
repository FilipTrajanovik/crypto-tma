"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { FileText, Image as ImageIcon, Download, Eye, Loader2 } from "lucide-react";

type Doc = {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

type TelegramWebApp = {
  openLink?: (url: string) => void;
  downloadFile?: (params: { url: string; file_name: string }, cb?: (accepted: boolean) => void) => void;
  isVersionAtLeast?: (v: string) => boolean;
};

function webApp(): TelegramWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (d: Doc) => /^image\/(png|jpe?g|gif|webp|avif)$/i.test(d.mime_type);
const isPdf = (d: Doc) => d.mime_type === "application/pdf" || /\.pdf$/i.test(d.file_name);
const canPreview = (d: Doc) => isImage(d) || isPdf(d);

async function mintLinks(id: number): Promise<{ viewUrl: string; downloadUrl: string }> {
  const res = await fetch(`/api/wallet/documents/${id}/link`);
  if (!res.ok) throw new Error("link");
  return res.json();
}

export default function WalletDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Doc | null>(null);

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

  // Inside Telegram the web view ignores the HTML download attribute and has no
  // PDF viewer, so use Telegram's own actions with a short-lived link. In a normal
  // browser the same-origin URL works directly.
  const handleDownload = async (doc: Doc) => {
    setBusy(`dl-${doc.id}`);
    try {
      const tg = webApp();
      if (tg?.downloadFile && tg.isVersionAtLeast?.("8.0")) {
        const { downloadUrl } = await mintLinks(doc.id);
        tg.downloadFile({ url: downloadUrl, file_name: doc.file_name });
      } else if (tg?.openLink) {
        const { downloadUrl } = await mintLinks(doc.id);
        tg.openLink(downloadUrl);
      } else {
        const a = document.createElement("a");
        a.href = `/api/wallet/documents/${doc.id}/file?download=1`;
        a.download = doc.file_name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      toast.add({ title: "Could not start the download. Try again.", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const handlePreview = async (doc: Doc) => {
    if (isImage(doc)) {
      setViewing(doc);
      return;
    }
    // PDFs: hand off to the device's own viewer, which renders every page.
    setBusy(`pv-${doc.id}`);
    try {
      const tg = webApp();
      if (tg?.openLink) {
        const { viewUrl } = await mintLinks(doc.id);
        tg.openLink(viewUrl);
      } else {
        window.open(`/api/wallet/documents/${doc.id}/file`, "_blank", "noopener");
      }
    } catch {
      toast.add({ title: "Could not open the preview. Try again.", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy px-5 pt-6 pb-10 max-w-md mx-auto">
      <PageHeader title="Documents" subtitle="Files your account manager has shared with you." />

      {docs === null ? (
        <div className="space-y-4 pt-2">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-14 w-full rounded-xl bg-card-navy" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center border-t border-line/60">
          <span className="graphite-chip flex items-center justify-center w-12 h-12 rounded-full">
            <FileText className="w-5 h-5" />
          </span>
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          <p className="text-xs text-muted-foreground max-w-[240px]">Files shared by your account manager will appear here.</p>
        </div>
      ) : (
        <ul className="border-t border-line/60">
          {docs.map((doc) => {
            const Icon = isImage(doc) ? ImageIcon : FileText;
            return (
              <li key={doc.id} className="flex items-center gap-3 py-3.5 border-b border-line/60">
                <span
                  className={`graphite-chip flex items-center justify-center w-11 h-11 rounded-full shrink-0 ${
                    isPdf(doc) ? "!text-patriot-red-bright" : "!text-brand-bright"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canPreview(doc) && (
                    <button
                      type="button"
                      onClick={() => handlePreview(doc)}
                      disabled={busy === `pv-${doc.id}`}
                      aria-label={`Preview ${doc.file_name}`}
                      className="graphite-chip flex items-center justify-center w-10 h-10 rounded-full text-brand-bright active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {busy === `pv-${doc.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={busy === `dl-${doc.id}`}
                    aria-label={`Download ${doc.file_name}`}
                    className="bg-brand-gradient shadow-brand-glow flex items-center justify-center w-10 h-10 rounded-full text-navy active:scale-95 transition-transform disabled:opacity-60"
                  >
                    {busy === `dl-${doc.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-md p-3">
          <DialogTitle className="text-sm font-medium truncate pr-8">{viewing?.file_name}</DialogTitle>
          {viewing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/wallet/documents/${viewing.id}/file`}
              alt={viewing.file_name}
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
          )}
          {viewing && (
            <button
              type="button"
              onClick={() => handleDownload(viewing)}
              className="bg-brand-gradient shadow-brand-glow flex items-center justify-center gap-2 h-11 rounded-xl text-navy text-sm font-bold uppercase tracking-wide"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
