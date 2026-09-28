import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "购物车",
  robots: { index: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
