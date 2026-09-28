"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { ImageUploadField } from "./ImageUploadField";
import { categories } from "@/config/categories";
import { stockStatuses } from "@/config/stock-status";
import type { Product } from "@/lib/types/database";
import type { ProductFormState } from "@/app/admin/(protected)/products/actions";

type Action = (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;

export function ProductForm({ product, action }: { product?: Product; action: Action }) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <Input
        label="商品名称"
        name="name"
        required
        defaultValue={product?.name}
        error={state.fieldErrors?.name?.[0]}
      />

      <Textarea
        label="商品描述"
        name="description"
        defaultValue={product?.description}
        error={state.fieldErrors?.description?.[0]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select label="分类" name="category" required defaultValue={product?.category} error={state.fieldErrors?.category?.[0]}>
          <option value="" disabled>
            请选择分类
          </option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select
          label="库存状态"
          name="stock_status"
          required
          defaultValue={product?.stock_status ?? "in_stock"}
          error={state.fieldErrors?.stock_status?.[0]}
        >
          {stockStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="价格 (RM)"
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={product?.price}
          error={state.fieldErrors?.price?.[0]}
        />
        <Input
          label="单位"
          name="unit"
          required
          placeholder="斤 / 包 / 份"
          defaultValue={product?.unit}
          error={state.fieldErrors?.unit?.[0]}
        />
      </div>

      <ImageUploadField defaultValue={product?.image_url} error={state.fieldErrors?.image_url?.[0]} />

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4 rounded border-ink-300" />
        设为首页精选商品
      </label>

      {state.error && (
        <div className="flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : product ? "保存修改" : "新增商品"}
        </Button>
        <LinkButton href="/admin/products" variant="outline">
          取消
        </LinkButton>
      </div>
    </form>
  );
}
