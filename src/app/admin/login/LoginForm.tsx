"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Input label="邮箱" name="email" type="email" required autoComplete="username" placeholder="admin@example.com" />
      <Input label="密码" name="password" type="password" required autoComplete="current-password" />
      {state.error && <p className="text-sm font-medium text-brand-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
