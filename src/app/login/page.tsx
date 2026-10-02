import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Log in to continue your quest.</p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <form action={loginAction} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue="demo@aiquest.dev"
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
            defaultValue="demo1234"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-2">
          Log In
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Demo account is pre-filled — just click Log In. Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary">
          Sign up
        </Link>
      </p>
    </div>
  );
}
