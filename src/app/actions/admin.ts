"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { toFormState, type FormState } from "@/lib/form-state";
import { deleteResource, runRowAction, saveResource } from "@/lib/admin/engine";

/** Every admin action re-checks the session against the DB (assertAdmin inside the engine) — never trust the page that rendered it. */
export async function saveResourceAction(key: string, id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const session = await getSession();
  try {
    await saveResource(session, key, id || null, fd);
  } catch (e) {
    return toFormState(e, !!session);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${key}?saved=1`);
}

export async function deleteResourceAction(key: string, id: string) {
  const session = await getSession();
  await deleteResource(session, key, id);
  revalidatePath("/", "layout");
  redirect(`/admin/${key}?deleted=1`);
}

export async function rowAction(key: string, id: string, actionKey: string) {
  const session = await getSession();
  try {
    await runRowAction(session, key, id, actionKey);
  } catch (e) {
    const state = toFormState(e, !!session);
    redirect(`/admin/${key}?error=${encodeURIComponent(state.message ?? "Failed")}`);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/${key}?done=${encodeURIComponent(actionKey)}`);
}
