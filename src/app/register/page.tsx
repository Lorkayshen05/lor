import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { registerAction } from "@/lib/auth/actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Start your first quest today.</p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <form action={registerAction} className="space-y-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-medium text-muted">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium text-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>
        <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-2">
          Sign Up
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}
