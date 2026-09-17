"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction, type FormState } from "@/app/actions/auth";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: FormState = {};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, EMPTY);

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-muted">Log in to keep your streak alive.</p>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />
        <Field label="Email" name="email" error={state.fieldErrors?.email}>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>
        <Field label="Password" name="password" error={state.fieldErrors?.password}>
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/register" className="text-accent-soft underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, EMPTY);

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-xl font-bold">Create your player</h1>
      <p className="mt-1 text-sm text-ink-muted">Level 1, 0 XP, 34 quests waiting.</p>

      <form action={action} className="mt-5 space-y-4">
        <Field label="Username" name="username" error={state.fieldErrors?.username} hint="Letters, numbers and underscores.">
          <input id="username" name="username" required minLength={3} maxLength={24} className={inputClass} />
        </Field>
        <Field label="Email" name="email" error={state.fieldErrors?.email}>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>
        <Field label="Password" name="password" error={state.fieldErrors?.password} hint="At least 8 characters.">
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
        </Field>
        <Field label="Confirm password" name="confirmPassword" error={state.fieldErrors?.confirmPassword}>
          <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className={inputClass} />
        </Field>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Start playing"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">
        Already playing?{" "}
        <Link href="/login" className="text-accent-soft underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
