import { NextResponse } from "next/server";

// Types that are safe for the browser to render on our origin. Everything else
// (HTML, SVG, XML, scripts, unknown) is always sent as a download so an
// uploaded file can never execute in the app's origin.
const INLINE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
};

/** Normalises a stored/uploaded MIME type, falling back to the file extension. */
export function resolveMimeType(fileName: string, mimeType: string | null | undefined) {
  const clean = (mimeType || "").split(";")[0].trim().toLowerCase();
  if (clean && clean !== "application/octet-stream") return clean;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? "application/octet-stream";
}

export function isPreviewable(mimeType: string) {
  return INLINE_TYPES.has(mimeType.toLowerCase());
}

function contentDisposition(type: "inline" | "attachment", fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

type StoredDoc = { file_name: string; mime_type: string; data: string };

export function documentResponse(doc: StoredDoc, opts: { download: boolean }) {
  const mime = resolveMimeType(doc.file_name, doc.mime_type);
  const inline = !opts.download && isPreviewable(mime);
  const buffer = Buffer.from(doc.data, "base64");

  // Chrome's built-in PDF viewer breaks under a restrictive CSP, so PDFs rely on nosniff alone.
  const csp: Record<string, string> = mime === "application/pdf" ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'" };

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": inline ? mime : isPreviewable(mime) ? mime : "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", doc.file_name),
      "X-Content-Type-Options": "nosniff",
      ...csp,
      "Cache-Control": "private, max-age=60",
    },
  });
}
