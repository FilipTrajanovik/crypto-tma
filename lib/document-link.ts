import jwt from "jsonwebtoken";

// Short-lived, single-document link so Telegram's native "open link" and
// "download file" actions (which do not send the app's session cookie) can
// fetch a file the signed-in user is already allowed to see.
const LINK_TTL_SECONDS = 300;

function secret(): string {
  const value = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("SESSION_SECRET environment variable is not set");
  return value;
}

export function createDocumentToken(docId: number, userId: number): string {
  return jwt.sign({ typ: "doc", docId, userId }, secret(), { expiresIn: LINK_TTL_SECONDS });
}

export function verifyDocumentToken(token: string, docId: number): { userId: number } | null {
  try {
    const payload = jwt.verify(token, secret()) as { typ?: string; docId?: number; userId?: number };
    if (payload.typ !== "doc" || payload.docId !== docId || !payload.userId) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
