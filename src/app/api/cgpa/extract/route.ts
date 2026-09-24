import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { extractStudyMaterial } from "@/lib/cgpaExtract";

const bodySchema = z.object({ text: z.string().min(20).max(20_000) });

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paste at least a few sentences of material." }, { status: 400 });

  const result = extractStudyMaterial(parsed.data.text);
  return NextResponse.json(result);
}
