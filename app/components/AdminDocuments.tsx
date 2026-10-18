"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { Check, Download, Eye, FileText, Image as ImageIcon, Loader2, Search, Trash2, Upload, X } from "lucide-react";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

type UserDoc = {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  uploaded_by_name: string | null;
  uploaded_by_username: string | null;
};

type QueueItem = {
  key: string;
  file: File;
  error: string | null;
  state: "ready" | "uploading" | "done" | "failed";
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isImage = (mime: string) => /^image\/(png|jpe?g|gif|webp|avif)$/i.test(mime);
const isPdf = (d: { mime_type: string; file_name: string }) => d.mime_type === "application/pdf" || /\.pdf$/i.test(d.file_name);

export default function AdminDocuments({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<UserDoc[] | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${userId}/documents`);
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents);
    } else {
      setDocs((d) => d ?? []);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const addFiles = (files: FileList | File[]) => {
    const items: QueueItem[] = Array.from(files).map((file, i) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${i}`,
      file,
      state: "ready",
      error: file.size === 0 ? "File is empty" : file.size > MAX_FILE_BYTES ? "Larger than 8 MB" : null,
    }));
    setQueue((q) => [...q, ...items]);
  };

  const uploadable = queue.filter((q) => !q.error && q.state !== "done");

  const handleUpload = async () => {
    if (uploading || uploadable.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (let i = 0; i < uploadable.length; i++) {
      const item = uploadable[i];
      setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: "uploading" } : x)));
      try {
        const form = new FormData();
        form.append("file", item.file);
        // only message the user once, after the last file
        if (i < uploadable.length - 1) form.append("notify", "0");
        const res = await fetch(`/api/admin/users/${userId}/documents`, { method: "POST", body: form });
        if (res.ok) {
          ok++;
          setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: "done" } : x)));
        } else {
          const err = await res.json().catch(() => ({}));
          setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: "failed", error: err.error || "Upload failed" } : x)));
        }
      } catch {
        setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: "failed", error: "Network error" } : x)));
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast.add({ title: ok === 1 ? "Document uploaded" : `${ok} documents uploaded`, type: "success" });
      await load();
      setQueue((q) => q.filter((x) => x.state !== "done"));
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${userId}/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.add({ title: "Document deleted", type: "success" });
        await load();
      } else {
        toast.add({ title: "Could not delete the document", type: "error" });
      }
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const totalSize = useMemo(() => (docs ?? []).reduce((n, d) => n + d.file_size, 0), [docs]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (docs ?? []).filter((d) => !q || d.file_name.toLowerCase().includes(q));
  }, [docs, query]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Documents</p>
        {docs && docs.length > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums pt-1">
            {docs.length} {docs.length === 1 ? "file" : "files"} · {formatSize(totalSize)}
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">Files you upload here appear in this user&apos;s wallet app, where they can preview and download them.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={`flex flex-col items-center gap-2 py-6 rounded-2xl border border-dashed cursor-pointer text-center transition-colors ${
          dragging ? "border-brand bg-brand/10" : "border-line hover:border-brand/50 hover:bg-white/[0.02]"
        }`}
      >
        <span className="bg-brand/10 text-brand-bright flex items-center justify-center w-11 h-11 rounded-full">
          <Upload className="w-5 h-5" />
        </span>
        <p className="text-sm font-medium text-foreground">Drop files here or click to choose</p>
        <p className="text-xs text-muted-foreground">You can pick several at once · up to 8 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <div className="mt-4">
          <ul className="border-t border-line/60">
            {queue.map((item) => (
              <li key={item.key} className="flex items-center gap-3 py-2.5 border-b border-line/60">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{item.file.name}</p>
                  <p className={`text-xs ${item.error ? "text-patriot-red-bright" : "text-muted-foreground"}`}>
                    {item.error ?? formatSize(item.file.size)}
                  </p>
                </div>
                {item.state === "uploading" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-bright" />
                ) : item.state === "done" ? (
                  <Check className="w-4 h-4 text-verified-bright" />
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setQueue((q) => q.filter((x) => x.key !== item.key))}
                    aria-label={`Remove ${item.file.name}`}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || uploadable.length === 0}
            className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand-gradient text-navy font-bold text-sm uppercase tracking-wide shadow-brand-glow hover:brightness-105 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading..." : `Upload ${uploadable.length} ${uploadable.length === 1 ? "file" : "files"}`}
          </button>
        </div>
      )}

      <div className="mt-6">
        {docs && docs.length > 4 && (
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-muted-foreground absolute left-0 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files"
              className="w-full h-10 bg-transparent border-b border-line pl-6 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand"
            />
          </div>
        )}

        {docs === null ? (
          <p className="text-sm text-muted-foreground py-4">Loading documents...</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 border-t border-line/60">No documents uploaded yet.</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 border-t border-line/60">No files match your search.</p>
        ) : (
          <ul className="border-t border-line/60">
            {shown.map((doc) => {
              const fileUrl = `/api/admin/documents/${doc.id}/file`;
              const previewable = isImage(doc.mime_type) || isPdf(doc);
              const uploader = doc.uploaded_by_name || (doc.uploaded_by_username ? `@${doc.uploaded_by_username}` : null);
              return (
                <li key={doc.id} className="flex items-center gap-3 py-3 border-b border-line/60">
                  {isImage(doc.mime_type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-line" />
                  ) : (
                    <span
                      className={`graphite-chip flex items-center justify-center w-11 h-11 rounded-full shrink-0 ${
                        isPdf(doc) ? "!text-patriot-red-bright" : "!text-brand-bright"
                      }`}
                    >
                      {isImage(doc.mime_type) ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}
                      {uploader ? ` · ${uploader}` : ""}
                    </p>
                  </div>

                  {confirmId === doc.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="h-8 px-3 rounded-full bg-patriot-red/15 text-patriot-red-bright text-xs font-bold uppercase tracking-wide ring-1 ring-patriot-red/40 disabled:opacity-60"
                      >
                        {deletingId === doc.id ? "Deleting..." : "Delete"}
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {previewable && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Preview ${doc.file_name}`}
                          className="graphite-chip flex items-center justify-center w-9 h-9 rounded-full text-brand-bright hover:brightness-125"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <a
                        href={`${fileUrl}?download=1`}
                        download={doc.file_name}
                        aria-label={`Download ${doc.file_name}`}
                        className="graphite-chip flex items-center justify-center w-9 h-9 rounded-full text-brand-bright hover:brightness-125"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirmId(doc.id)}
                        aria-label={`Delete ${doc.file_name}`}
                        className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-patriot-red-bright hover:bg-patriot-red/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
