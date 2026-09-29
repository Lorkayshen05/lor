import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/business/dashboard", "/api/", "/login", "/register"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
