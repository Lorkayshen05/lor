import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: `What personal data ${SITE.name} collects, why, and how to contact us about it.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumbs items={[{ name: "Privacy", href: "/privacy" }]} />
      <article className="prose-content mx-auto mt-4 max-w-3xl">
        <h1 className="!m-0 text-2xl font-black sm:text-4xl">Privacy</h1>
        <p><em>Summary for the MVP — have this reviewed against the Personal Data Protection Act 2010 (PDPA) before launch.</em></p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Accounts:</strong> name, email and a hashed password when you register.</li>
          <li><strong>Enquiries and claims:</strong> the details you type into a form (name, phone, email, message). Enquiries are shared with the business you contact and our team.</li>
          <li><strong>Usage analytics:</strong> page views, searches and clicks on directions/call/WhatsApp. We don’t store your IP address; a daily-rotating anonymous hash is used to estimate unique visitors.</li>
          <li><strong>Location:</strong> only if you press “Near Me”. Your coordinates are used in your browser request to sort results and are not stored.</li>
        </ul>
        <h2>Cookies</h2>
        <p>We set one essential, HTTP-only cookie when you log in. If Google Analytics is enabled on this site it may set its own cookies.</p>
        <h2>Contact</h2>
        <p>To access, correct or delete your data, email {SITE.contactEmail}.</p>
      </article>
    </div>
  );
}
