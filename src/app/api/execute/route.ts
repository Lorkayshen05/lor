import { NextRequest, NextResponse } from "next/server";
import { runPython } from "@/lib/sandbox";

const MAX_CODE_LENGTH = 20_000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("code" in body)) {
    return NextResponse.json({ error: "Missing 'code' field." }, { status: 400 });
  }

  const { code, stdin } = body as { code: unknown; stdin?: unknown };

  if (typeof code !== "string" || code.length === 0) {
    return NextResponse.json({ error: "'code' must be a non-empty string." }, { status: 400 });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: "Code is too long." }, { status: 400 });
  }
  if (stdin !== undefined && typeof stdin !== "string") {
    return NextResponse.json({ error: "'stdin' must be a string." }, { status: 400 });
  }

  const result = await runPython(code, typeof stdin === "string" ? stdin : "");
  return NextResponse.json(result);
}
