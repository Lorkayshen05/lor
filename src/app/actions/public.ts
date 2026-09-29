"use server";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formToObject, toFormState, type FormState } from "@/lib/form-state";
import { createLead } from "@/lib/services/leads";
import { submitReview } from "@/lib/services/reviews";
import { submitClaim } from "@/lib/services/claims";

export async function leadAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  const ip = clientIp(await headers());
  if (!rateLimit(`lead:${ip}`, 5, 60 * 60_000).ok) return { ok: false, message: "You've sent several enquiries already. Please try again later." };
  // Honeypot: real users never see or fill this field.
  if (fd.get("website_url")) return { ok: true, message: "Thanks! Your message has been sent." };
  try {
    await createLead(formToObject(fd), session?.id ?? null);
    return { ok: true, message: "Thanks! Your message has been sent to the business." };
  } catch (e) {
    return toFormState(e, !!session);
  }
}

export async function reviewAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  const ip = clientIp(await headers());
  if (!rateLimit(`review:${ip}`, 10, 60 * 60_000).ok) return { ok: false, message: "Too many reviews submitted. Please try again later." };
  try {
    await submitReview(session, formToObject(fd));
    return { ok: true, message: "Thanks! Your review will appear once it has been checked by our team." };
  } catch (e) {
    return toFormState(e, !!session);
  }
}

export async function claimAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  const ip = clientIp(await headers());
  if (!rateLimit(`claim:${ip}`, 5, 60 * 60_000).ok) return { ok: false, message: "Too many claim requests. Please try again later." };
  try {
    await submitClaim(session, formToObject(fd));
    return { ok: true, message: "Claim submitted. We'll contact you to verify ownership before approving it." };
  } catch (e) {
    return toFormState(e, !!session);
  }
}
