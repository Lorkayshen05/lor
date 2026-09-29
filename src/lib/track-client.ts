"use client";

export type ClientEvent = {
  type: "PAGE_VIEW" | "SEARCH" | "STORE_VIEW" | "DIRECTIONS_CLICK" | "PHONE_CLICK" | "WHATSAPP_CLICK" | "WEBSITE_CLICK" | "SPONSORED_CLICK" | "AD_CLICK";
  path?: string;
  branchId?: string;
  businessId?: string;
  searchTerm?: string;
  meta?: Record<string, string | number | boolean>;
};

/** Fire-and-forget; never blocks navigation and never throws. */
export function track(event: ClientEvent) {
  try {
    const body = JSON.stringify({ path: window.location.pathname, ...event });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {
    /* analytics must never break the page */
  }
}
