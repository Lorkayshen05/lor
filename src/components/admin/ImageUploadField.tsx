"use client";

import { useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";

export function ImageUploadField({ defaultValue, error }: { defaultValue?: string | null; error?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadErr) {
        setUploadError(`上传失败：${uploadErr.message}`);
        return;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setValue(data.publicUrl);
    } catch {
      setUploadError("上传失败，请重试或直接填写图片链接。");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink-800">商品图片</label>

      {value && (
        <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-ink-100">
          {/* Preview only — plain img avoids next/image domain config for arbitrary uploaded URLs */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="商品图片预览" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute right-1 top-1 rounded-full bg-ink-900/60 p-1 text-white"
            aria-label="移除图片"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-dashed border-ink-200 px-4 py-2 text-sm text-ink-500 hover:border-brand-300 hover:text-brand-600">
        {isUploading ? <Spinner className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
        {isUploading ? "上传中..." : "上传图片"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
      </label>

      {uploadError && <p className="text-xs text-brand-600">{uploadError}</p>}

      <Input
        label="或直接填写图片链接"
        name="image_url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://..."
        error={error}
        hint="留空则显示分类默认图案"
      />
    </div>
  );
}
