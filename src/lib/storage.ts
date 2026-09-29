import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ValidationFailure } from "@/lib/auth/errors";

/**
 * Pluggable storage. Only the "local" driver is implemented (dev / single VPS with a persistent disk).
 * On serverless hosts (Vercel) the disk is ephemeral: set STORAGE_DRIVER=none and add an S3/R2 driver
 * implementing `put`/`get` before enabling uploads. See docs/deployment.md.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ROOT = path.join(process.cwd(), "storage", "uploads");
export const FILE_RE = /^[a-f0-9]{24}\.webp$/;

export function uploadsEnabled(): boolean {
  return (process.env.STORAGE_DRIVER ?? "local") === "local";
}

/** Validates it is really a JPEG/PNG/WebP, strips metadata, applies EXIF rotation, resizes, re-encodes to WebP. */
export async function processAndStoreImage(input: Buffer): Promise<{ url: string }> {
  if (!uploadsEnabled()) throw new ValidationFailure("Photo uploads are not enabled on this deployment.");
  if (input.length === 0 || input.length > MAX_UPLOAD_BYTES) throw new ValidationFailure("Image must be under 5 MB.");
  let meta;
  try {
    meta = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ValidationFailure("That file isn't a valid image.");
  }
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new ValidationFailure("Only JPEG, PNG or WebP images are allowed.");
  const out = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const name = `${randomBytes(12).toString("hex")}.webp`;
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, name), out);
  return { url: `/media/${name}` };
}

export async function readStoredImage(file: string): Promise<Buffer | null> {
  if (!FILE_RE.test(file)) return null; // blocks path traversal
  try {
    return await readFile(path.join(ROOT, file));
  } catch {
    return null;
  }
}
