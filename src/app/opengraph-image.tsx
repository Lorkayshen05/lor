import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #952c22 0%, #b23a2e 50%, #5f1e19 100%)",
          color: "white",
          fontSize: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 120,
            height: 120,
            borderRadius: 60,
            background: "white",
            color: "#952c22",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
            fontWeight: 700,
            marginBottom: 32,
          }}
        >
          永
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>{siteConfig.name}</div>
        <div style={{ display: "flex", marginTop: 16, opacity: 0.85 }}>{siteConfig.tagline}</div>
      </div>
    ),
    { ...size }
  );
}
