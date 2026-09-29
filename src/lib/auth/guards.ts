import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";

/** For pages: redirect anonymous visitors to /login. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return session;
}

/** For pages: admin-only. Non-admins get a 404 so the area's existence isn't advertised. */
export async function requireAdminPage(): Promise<SessionUser> {
  const session = await requireUser("/admin");
  if (session.role !== "ADMIN") notFound();
  return session;
}

export async function requireBusinessPage(next = "/business/dashboard"): Promise<SessionUser> {
  const session = await requireUser(next);
  if (session.role !== "BUSINESS_OWNER" && session.role !== "ADMIN") redirect("/business/claim");
  return session;
}
