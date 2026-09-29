import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AuthForm } from "@/components/forms";
import { loginAction } from "@/app/actions/auth";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "");
  const session = await getSession();
  if (session) redirect(next || (session.role === "ADMIN" ? "/admin" : session.role === "BUSINESS_OWNER" ? "/business/dashboard" : "/"));
  return (
    <div className="container-page py-10">
      <div className="card mx-auto max-w-md p-6">
        <h1 className="text-2xl font-black">Log in</h1>
        <p className="mb-4 mt-1 text-sm text-muted">For business owners and admins, and to write reviews.</p>
        <AuthForm mode="login" action={loginAction} next={next || undefined} />
        <p className="mt-4 text-sm text-muted">New here? <Link className="font-semibold text-pandan-700 underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p>
      </div>
    </div>
  );
}
