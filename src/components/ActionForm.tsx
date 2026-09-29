"use client";
import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/form-state";
import { FormMessage } from "./forms";

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
  className?: string;
  encType?: "multipart/form-data";
  testId?: string;
};

/** Generic form wrapper for server actions: pending state, field errors via <FieldErrors>, status message. */
export function ActionForm({ action, submitLabel, children, resetOnSuccess, className, encType, testId }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} encType={encType} className={className ?? "space-y-3"} data-testid={testId}>
      {children}
      {state.fieldErrors && (
        <ul className="rounded-lg bg-chili-50 px-3 py-2 text-sm text-chili-700" role="alert">
          {Object.entries(state.fieldErrors).flatMap(([k, msgs]) => msgs.map((m) => <li key={`${k}${m}`}>{k === "_form" ? "" : `${k}: `}{m}</li>))}
        </ul>
      )}
      <FormMessage state={state.fieldErrors ? { ...state, message: state.ok ? state.message : undefined } : state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}
