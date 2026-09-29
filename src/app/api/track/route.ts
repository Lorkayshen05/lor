import { NextResponse, type NextRequest } from "next/server";
import { recordEvent } from "@/lib/services/analytics";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 2048;

export async function POST(req: NextRequest) {
  // Same-origin only: browsers always send Origin on POST.
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return new NextResponse(null, { status: 403 });

  const ip = clientIp(req.headers);
  if (!rateLimit(`track:${ip}`, 120, 60_000).ok) return new NextResponse(null, { status: 429 });

  const text = await req.text();
  if (text.length > MAX_BYTES) return new NextResponse(null, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  try {
    await recordEvent(json, { ip, userAgent: req.headers.get("user-agent"), referrer: req.headers.get("referer") });
  } catch (e) {
    console.error("track failed", e); // analytics failures must never surface to visitors
  }
  return new NextResponse(null, { status: 204 });
}
