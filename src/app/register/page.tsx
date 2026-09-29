import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AuthForm } from "@/components/forms";
import { registerAction } from "@/app/actions/auth";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "");
  if (await getSession()) redirect(next || "/business/claim");
  return (
    <div className="container-page py-10">
      <div className="card mx-auto max-w-md p-6">
        <h1 className="text-2xl font-black">Create your account</h1>
        <p className="mb-4 mt-1 text-sm text-muted">Free. Needed to claim a listing or write a review.</p>
        <AuthForm mode="register" action={registerAction} next={next || undefined} />
        <p className="mt-4 text-sm text-muted">Already registered? <Link className="font-semibold text-pandan-700 underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></p>
      </div>
    </div>
  );
}
