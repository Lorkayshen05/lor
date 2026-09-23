import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/lib/user";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const { topic, detail } = body as Record<string, unknown>;
  if (typeof topic !== "string" || topic.length === 0 || topic.length > 200) {
    return NextResponse.json({ error: "'topic' must be a non-empty string under 200 chars." }, { status: 400 });
  }
  if (typeof detail !== "string" || detail.length > 500) {
    return NextResponse.json({ error: "'detail' must be a string under 500 chars." }, { status: 400 });
  }

  const user = await getOrCreateDemoUser();
  const existing = await prisma.mistake.findFirst({ where: { userId: user.id, topic } });

  if (existing) {
    await prisma.mistake.update({ where: { id: existing.id }, data: { count: existing.count + 1, detail } });
  } else {
    await prisma.mistake.create({ data: { userId: user.id, topic, detail } });
  }

  return NextResponse.json({ ok: true });
}
