import Link from "next/link";
import { PackageX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-100 px-4 text-center">
      <PackageX className="h-14 w-14 text-ink-300" />
      <h1 className="font-display text-2xl font-bold text-ink-900">页面未找到</h1>
      <p className="max-w-sm text-sm text-ink-500">您访问的页面不存在，或商品已被下架。</p>
      <div className="mt-2 flex gap-3">
        <LinkButton href="/">返回首页</LinkButton>
        <Link href="/products" className="inline-flex items-center px-2 text-sm font-medium text-brand-600 hover:text-brand-700">
          浏览全部商品
        </Link>
      </div>
    </div>
  );
}
