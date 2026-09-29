import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getNearestStores } from "@/lib/queries/stores";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const q = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export async function GET(req: NextRequest) {
  if (!rateLimit(`nearby:${clientIp(req.headers)}`, 30, 60_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  const stores = await getNearestStores(parsed.data, 6);
  return NextResponse.json({ stores }, { headers: { "cache-control": "private, no-store" } });
}
