import { ForbiddenError, ValidationFailure } from "@/lib/auth/errors";

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  needsLogin?: boolean;
};

/** Turn service errors into form state; unexpected errors are logged and never leaked to the user. */
export function toFormState(e: unknown, loggedIn: boolean): FormState {
  if (e instanceof ValidationFailure) return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
  if (e instanceof ForbiddenError) return { ok: false, message: e.message, needsLogin: !loggedIn };
  console.error(e);
  return { ok: false, message: "Something went wrong. Please try again." };
}

export const formToObject = (fd: FormData): Record<string, string> =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string") as [string, string][]);
