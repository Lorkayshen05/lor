"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";

export function Field({ label, name, errors, hint, children }: { label: string; name: string; errors?: string[]; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
      {hint && !errors?.length && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {errors?.map((e) => <p key={e} className="mt-1 text-sm text-chili-700" role="alert">{e}</p>)}
    </div>
  );
}

export function FormMessage({ state, loginNext }: { state: FormState; loginNext?: string }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-pandan-100 text-pandan-900" : "bg-chili-50 text-chili-700"}`}>
      {state.message}
      {state.needsLogin && (
        <>
          {" "}<Link className="font-semibold underline" href={`/login?next=${encodeURIComponent(loginNext ?? "/")}`}>Log in</Link> or{" "}
          <Link className="font-semibold underline" href={`/register?next=${encodeURIComponent(loginNext ?? "/")}`}>create an account</Link>.
        </>
      )}
    </p>
  );
}

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function LeadForm({ action, businessId, branchId, businessName, sourcePath }: { action: Action; businessId: string; branchId: string; businessName: string; sourcePath: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-3" data-testid="lead-form">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="sourcePath" value={sourcePath} />
      <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" name="website_url" /></div>
      <Field label="I want to…" name="type">
        <select id="type" name="type" className="input" defaultValue="QUOTATION">
          <option value="QUOTATION">Request a quotation</option>
          <option value="CONTACT">Ask a question</option>
        </select>
      </Field>
      <Field label="Your name" name="name" errors={fe.name}><input id="name" name="name" className="input" autoComplete="name" required maxLength={80} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone / WhatsApp" name="phone" errors={fe.phone}><input id="phone" name="phone" className="input" type="tel" autoComplete="tel" placeholder="012-345 6789" /></Field>
        <Field label="Email" name="email" errors={fe.email}><input id="email" name="email" className="input" type="email" autoComplete="email" /></Field>
      </div>
      <Field label={`Message to ${businessName}`} name="message" errors={fe.message} hint="E.g. what you need, quantity, and when.">
        <textarea id="message" name="message" className="input" rows={4} required minLength={10} maxLength={2000} />
      </Field>
      <FormMessage state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}</button>
      <p className="text-xs text-muted">Your details are shared only with this business and our team.</p>
    </form>
  );
}

export function ReviewForm({ action, branchId, next }: { action: Action; branchId: string; next: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-3" data-testid="review-form">
      <input type="hidden" name="branchId" value={branchId} />
      <Field label="Rating" name="rating" errors={fe.rating}>
        <select id="rating" name="rating" className="input" defaultValue="5">
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
        </select>
      </Field>
      <Field label="Your review" name="body" errors={fe.body} hint="Share your own experience. Reviews are checked before they appear.">
        <textarea id="body" name="body" className="input" rows={4} required minLength={10} maxLength={2000} />
      </Field>
      <FormMessage state={state} loginNext={next} />
      <button className="btn btn-outline" disabled={pending}>{pending ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}

export function ClaimForm({ action, businessId, defaultName, defaultEmail }: { action: Action; businessId: string; defaultName?: string; defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-3" data-testid="claim-form">
      <input type="hidden" name="businessId" value={businessId} />
      <Field label="Your full name" name="claimantName" errors={fe.claimantName}><input id="claimantName" name="claimantName" defaultValue={defaultName} className="input" required maxLength={80} /></Field>
      <Field label="Your role" name="claimantRole" errors={fe.claimantRole}><input id="claimantRole" name="claimantRole" className="input" placeholder="Owner, manager…" required maxLength={60} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone" name="phone" errors={fe.phone} hint="We'll call the shop to verify."><input id="phone" name="phone" className="input" type="tel" required placeholder="012-345 6789" /></Field>
        <Field label="Email" name="email" errors={fe.email}><input id="email" name="email" defaultValue={defaultEmail} className="input" type="email" required /></Field>
      </div>
      <Field label="Anything that helps us verify you (optional)" name="note" errors={fe.note}><textarea id="note" name="note" className="input" rows={3} maxLength={1000} /></Field>
      <FormMessage state={state} loginNext="/business/claim" />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Submitting…" : "Submit claim for review"}</button>
    </form>
  );
}

export function AuthForm({ mode, action, next }: { mode: "login" | "register"; action: Action; next?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-3" data-testid={`${mode}-form`}>
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && <Field label="Your name" name="name" errors={fe.name}><input id="name" name="name" className="input" autoComplete="name" required /></Field>}
      <Field label="Email" name="email" errors={fe.email}><input id="email" name="email" type="email" className="input" autoComplete="email" required /></Field>
      <Field label="Password" name="password" errors={fe.password} hint={mode === "register" ? "At least 10 characters." : undefined}>
        <input id="password" name="password" type="password" className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      </Field>
      <FormMessage state={state} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
    </form>
  );
}
