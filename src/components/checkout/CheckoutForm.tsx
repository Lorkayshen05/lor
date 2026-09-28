"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/product/ProductImage";
import { formatCurrency } from "@/lib/utils";
import { createOrder } from "@/app/(shop)/checkout/actions";

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({ customerName: "", phone: "", address: "", notes: "" });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createOrder({
        ...form,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });

      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      clear();
      router.push(`/checkout/success/${result.orderId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3 lg:gap-12">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <h2 className="font-display text-lg font-semibold text-ink-900">收件资料</h2>

        <Input
          label="姓名"
          required
          value={form.customerName}
          onChange={(e) => update("customerName", e.target.value)}
          error={fieldErrors.customerName?.[0]}
          placeholder="请输入您的姓名"
        />
        <Input
          label="电话号码"
          required
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={fieldErrors.phone?.[0]}
          placeholder="012-3456789"
        />
        <Textarea
          label="送货地址"
          required
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          error={fieldErrors.address?.[0]}
          placeholder="请输入完整地址，包括门牌号、街道、邮区"
        />
        <Textarea
          label="备注（选填）"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          error={fieldErrors.notes?.[0]}
          placeholder="例如：指定送货时间、特殊要求等"
        />

        {formError && (
          <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Button type="submit" size="lg" disabled={isPending || items.length === 0} className="mt-2">
          {isPending ? "提交中..." : "确认下单"}
        </Button>
      </div>

      <aside className="rounded-2xl border border-ink-100 bg-white p-5 lg:sticky lg:top-24 lg:h-fit">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">订单摘要</h2>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  category={item.category}
                  className="h-full w-full"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 text-sm">
                <p className="line-clamp-1 font-medium text-ink-900">{item.name}</p>
                <p className="text-ink-400">
                  {formatCurrency(item.price)} x {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink-800">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="text-ink-500">总计</span>
          <span className="font-display text-xl font-bold text-brand-700">{formatCurrency(subtotal)}</span>
        </div>
      </aside>
    </form>
  );
}
