import "server-only";
import { db } from "@/lib/db";
import { assertAdmin, ForbiddenError, ValidationFailure, type Actor } from "@/lib/auth/errors";
import { normalizeMyPhone, safeHttpUrl, slugify } from "@/lib/utils";
import { DB_NULL, getResource, type FieldDef, type ResourceDef } from "./resources";

type Row = Record<string, unknown>;
type Delegate = {
  findMany(args: unknown): Promise<Row[]>;
  count(args?: unknown): Promise<number>;
  findUnique(args: unknown): Promise<Row | null>;
  create(args: unknown): Promise<Row>;
  update(args: unknown): Promise<Row>;
  delete(args: unknown): Promise<Row>;
};
// The ONLY place we index Prisma dynamically; `model` values come from the static registry, never from user input.
const delegate = (def: ResourceDef) => (db as unknown as Record<string, Delegate>)[def.model];

export const PAGE_SIZE = 25;

function resolve(key: string): ResourceDef {
  const def = getResource(key);
  if (!def) throw new ValidationFailure("Unknown resource.");
  return def;
}

/** "YYYY-MM-DDTHH:mm" (datetime-local, interpreted as Malaysia time) → Date. */
export function parseMyt(value: string): Date | null {
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.length === 16 ? `${value}:00` : value}+08:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "YYYY-MM-DDTHH:mm" in Malaysia time for <input type=datetime-local>. */
export function toMytInput(value: unknown): string {
  if (!(value instanceof Date)) return "";
  return new Date(value.getTime() + 8 * 3_600_000).toISOString().slice(0, 16);
}

export function parseFields(def: ResourceDef, fd: FormData, mode: "create" | "update") {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string[]> = {};
  const fail = (f: FieldDef, m: string) => (errors[f.name] ??= []).push(`${f.label}: ${m}`);

  for (const f of def.fields) {
    const raw = f.type === "multirelation" ? "" : String(fd.get(f.name) ?? "").trim();
    const blank = raw === "";
    if (f.required && blank && f.type !== "boolean" && f.type !== "multirelation" && f.type !== "slug") { fail(f, "is required"); continue; }
    if (f.max && raw.length > f.max) { fail(f, `must be at most ${f.max} characters`); continue; }

    switch (f.type) {
      case "text": case "textarea": if (blank) { if (!f.notNull) data[f.name] = null; } else data[f.name] = raw; break;
      case "slug": {
        const s = blank && f.slugFrom ? slugify(String(fd.get(f.slugFrom) ?? "")) : raw;
        if (!s) { fail(f, "is required"); break; }
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) { fail(f, "use lowercase letters, numbers and hyphens only"); break; }
        data[f.name] = s; break;
      }
      case "url": { if (blank) { data[f.name] = null; break; } const u = safeHttpUrl(raw); if (u) data[f.name] = u; else fail(f, "must be a valid http(s) URL"); break; }
      case "phone": { if (blank) { data[f.name] = null; break; } const p = normalizeMyPhone(raw); if (p) data[f.name] = p; else fail(f, "enter a valid Malaysian number"); break; }
      case "int": { if (blank) break; /* int columns are NOT NULL with defaults: leave unchanged / use the default */ const n = Number(raw); if (Number.isInteger(n)) data[f.name] = n; else fail(f, "must be a whole number"); break; }
      case "float": { if (blank) { data[f.name] = null; break; } const n = Number(raw); if (Number.isFinite(n)) data[f.name] = n; else fail(f, "must be a number"); break; }
      case "money": { if (blank) { data[f.name] = null; break; } const n = Number(raw); if (n >= 0 && Number.isFinite(n)) data[f.name] = Math.round(n * 100); else fail(f, "must be an amount in RM"); break; }
      case "boolean": data[f.name] = fd.get(f.name) === "on" || fd.get(f.name) === "true"; break;
      case "select": {
        if (blank) { data[f.name] = null; break; }
        if (!f.options?.some((o) => o.value === raw)) { fail(f, "is not a valid choice"); break; }
        data[f.name] = f.name === "priceLevel" ? Number(raw) : raw; break;
      }
      case "relation": data[f.name] = blank ? null : raw; break;
      case "multirelation": {
        const ids = fd.getAll(f.name).map(String).filter(Boolean);
        data[f.name] = mode === "create" ? { connect: ids.map((id) => ({ id })) } : { set: ids.map((id) => ({ id })) };
        break;
      }
      case "datetime": { if (blank) { data[f.name] = null; break; } const d = parseMyt(raw); if (d) data[f.name] = d; else fail(f, "is not a valid date/time"); break; }
      case "json": {
        if (blank) { data[f.name] = DB_NULL; break; }
        try {
          const v = JSON.parse(raw);
          const problem = f.jsonCheck?.(v);
          if (problem) fail(f, problem);
          else data[f.name] = v;
        } catch { fail(f, "is not valid JSON"); }
        break;
      }
    }
  }
  return { data, errors };
}

export async function saveResource(actor: Actor | null, key: string, id: string | null, fd: FormData) {
  assertAdmin(actor);
  const def = resolve(key);
  if (id ? def.canEdit === false || def.fields.length === 0 : !def.canCreate) throw new ForbiddenError("This record can't be edited here.");
  const mode = id ? "update" : "create";
  const { data, errors } = parseFields(def, fd, mode);
  if (Object.keys(errors).length) throw new ValidationFailure("Please fix the highlighted problems.", errors);
  const problem = await def.beforeSave?.(data, { actor, id, mode });
  if (problem) throw new ValidationFailure(problem);
  try {
    return id
      ? await delegate(def).update({ where: { id }, data })
      : await delegate(def).create({ data });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") throw new ValidationFailure("That value already exists (slugs and codes must be unique).");
    if (code === "P2003") throw new ValidationFailure("A selected related record doesn't exist.");
    if (code === "P2025") throw new ValidationFailure("Record not found.");
    throw e;
  }
}

export async function deleteResource(actor: Actor | null, key: string, id: string) {
  assertAdmin(actor);
  const def = resolve(key);
  if (!def.canDelete) throw new ForbiddenError("This record can't be deleted.");
  await delegate(def).delete({ where: { id } });
}

export async function runRowAction(actor: Actor | null, key: string, id: string, actionKey: string) {
  assertAdmin(actor);
  const action = resolve(key).rowActions?.find((a) => a.key === actionKey);
  if (!action) throw new ValidationFailure("Unknown action.");
  await action.run(actor, id);
}

export async function listResource(key: string, opts: { q?: string; status?: string; page?: number }) {
  const def = resolve(key);
  const where: Record<string, unknown> = {};
  const q = opts.q?.slice(0, 80);
  if (q && def.search?.length) where.OR = def.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));
  if (opts.status && def.statusFilter?.options.includes(opts.status)) where[def.statusFilter.field] = opts.status;
  const page = Math.max(1, opts.page ?? 1);
  const [total, rows] = await Promise.all([
    delegate(def).count({ where }),
    delegate(def).findMany({ where, orderBy: def.orderBy, include: def.include, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { def, rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getRow(key: string, id: string) {
  const def = resolve(key);
  const row = await delegate(def).findUnique({ where: { id }, include: def.fields.filter((f) => f.type === "multirelation").length ? Object.fromEntries(def.fields.filter((f) => f.type === "multirelation").map((f) => [f.name, { select: { id: true } }])) : undefined });
  return { def, row };
}

export const getPath = (row: Row, path: string): unknown => path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Row)[k] : undefined), row);
