import { NextResponse } from "next/server";
import { readStoredImage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const buf = await readStoredImage((await params).file);
  if (!buf) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
