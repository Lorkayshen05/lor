"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/admin/(protected)/products/actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`确定要删除「${name}」吗？此操作无法撤销。`)) return;
    startTransition(async () => {
      try {
        await deleteProduct(id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "删除失败");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`删除 ${name}`}
      className="rounded-full p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
