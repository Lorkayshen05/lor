"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track-client";

const PRIVATE = ["/admin", "/business/dashboard", "/login", "/register"];

/** One PAGE_VIEW per client-side route change; private areas are never tracked. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (PRIVATE.some((p) => pathname.startsWith(p))) return;
    track({ type: "PAGE_VIEW", path: pathname });
  }, [pathname]);
  return null;
}
