import Image from "next/image";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  category,
  className,
  sizes,
  priority,
}: {
  src: string | null;
  alt: string;
  category: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-cream-200", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-cream-200 to-gold-50",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 14px)",
        }}
      />
      <CategoryIcon slug={category} className="relative h-10 w-10 text-brand-400/70" />
    </div>
  );
}
