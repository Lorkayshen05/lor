"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/app/actions/profile";
import { Button, Card, Field, inputClass } from "@/components/ui";

const EMPTY: ProfileState = {};

export function ProfileForm({
  profile,
}: {
  profile: { displayName: string; bio: string; goal: string; avatarUrl: string };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, EMPTY);

  return (
    <Card>
      <h2 className="font-bold">Profile</h2>
      <form action={action} className="mt-4 space-y-3">
        <Field label="Display name" name="displayName" error={state.fieldErrors?.displayName}>
          <input id="displayName" name="displayName" defaultValue={profile.displayName} required className={inputClass} />
        </Field>
        <Field label="Bio" name="bio" error={state.fieldErrors?.bio}>
          <textarea id="bio" name="bio" defaultValue={profile.bio} rows={3} className={inputClass} />
        </Field>
        <Field label="Learning goal" name="goal" error={state.fieldErrors?.goal}>
          <input id="goal" name="goal" defaultValue={profile.goal} className={inputClass} />
        </Field>
        <Field label="Avatar URL" name="avatarUrl" error={state.fieldErrors?.avatarUrl}>
          <input id="avatarUrl" name="avatarUrl" type="url" defaultValue={profile.avatarUrl} className={inputClass} />
        </Field>

        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
