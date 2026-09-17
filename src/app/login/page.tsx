import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/forms/auth-forms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex justify-center py-10">
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
