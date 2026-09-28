import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "结算",
  robots: { index: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
