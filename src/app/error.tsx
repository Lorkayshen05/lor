"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-100 px-4 text-center">
      <AlertTriangle className="h-14 w-14 text-brand-400" />
      <h1 className="font-display text-2xl font-bold text-ink-900">出错了</h1>
      <p className="max-w-sm text-sm text-ink-500">页面加载时发生错误，请重试，或稍后再访问。</p>
      <div className="mt-2 flex gap-3">
        <Button onClick={reset}>重试</Button>
        <LinkButton href="/" variant="outline">
          返回首页
        </LinkButton>
      </div>
    </div>
  );
}
