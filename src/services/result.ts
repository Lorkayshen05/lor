import type { Meta } from "../contracts/common";

export interface Result<T> {
  data: T;
  meta: Meta;
}

export function result<T>(
  data: T,
  o: { asOf?: string; source?: string | string[]; stale?: boolean; nextCursor?: string } = {},
): Result<T> {
  const meta: Meta = {};
  if (o.asOf) meta.asOf = o.asOf;
  if (o.source) meta.source = Array.isArray(o.source) ? [...new Set(o.source)].join(", ") : o.source;
  if (o.nextCursor) meta.nextCursor = o.nextCursor;
  if (o.stale) meta.stale = true;
  return { data, meta };
}
