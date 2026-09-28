import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "商家登录",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display text-xl font-bold text-white">
            永
          </span>
          <h1 className="mt-3 font-display text-xl font-bold text-ink-900">{siteConfig.name}</h1>
          <p className="mt-1 text-sm text-ink-400">商家管理后台</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
