import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "@/components/forms/auth-forms";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="flex justify-center py-10">
      <RegisterForm />
    </div>
  );
}
