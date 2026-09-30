import { badRequest } from "./errors";
import { hash32 } from "./hash";

/** Opaque offset cursor bound to a filter fingerprint, so a cursor can't be replayed against different filters. */
export const fingerprint = (x: unknown): string => hash32(JSON.stringify(x)).toString(36);

export function encodeCursor(offset: number, fp: string): string {
  return Buffer.from(JSON.stringify({ o: offset, f: fp })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined, fp: string): number {
  if (!cursor) return 0;
  try {
    const v = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { o?: unknown; f?: unknown };
    if (typeof v.o === "number" && Number.isInteger(v.o) && v.o >= 0 && v.f === fp) return v.o;
  } catch {
    /* fall through */
  }
  throw badRequest("Invalid cursor");
}
