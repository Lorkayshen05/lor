import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDashboardContext } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/forms";
import { addProductAction, removeProductAction } from "@/app/actions/business";
import { formatMyr } from "@/lib/utils";

export const metadata: Metadata = { title: "Products", robots: { index: false, follow: false } };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const ctx = await getDashboardContext((await searchParams).b);
  const { business } = ctx;
  const [rows, products] = await Promise.all([
    db.businessProduct.findMany({ where: { businessId: business.id }, include: { product: true, branch: true }, orderBy: { product: { name: "asc" } } }),
    db.product.findMany({ where: { isPublished: true }, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }], include: { category: { select: { name: true } } } }),
  ]);
  return (
    <DashboardShell ctx={ctx} active="/products" title="Products">
      <p className="mb-4 max-w-2xl text-sm text-muted">Only list products you actually sell. Shoppers see these on your store page as “listed by the business”, with the price you enter.</p>
      <section className="card p-5" aria-labelledby="add">
        <h2 id="add" className="mb-3 text-lg font-extrabold">Add a product</h2>
        <ActionForm action={addProductAction.bind(null, business.id)} submitLabel="Add product" resetOnSuccess testId="product-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product" name="productId"><select id="productId" name="productId" className="input" required defaultValue=""><option value="" disabled>Select…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.category.name} — {p.name}</option>)}</select></Field>
            <Field label="Branch" name="branchId"><select id="branchId" name="branchId" className="input" defaultValue=""><option value="">All branches</option>{business.branches.map((b) => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select></Field>
            <Field label="Price (RM), optional" name="priceRm"><input id="priceRm" name="priceRm" className="input" inputMode="decimal" placeholder="12.90" /></Field>
            <Field label="Per…" name="priceUnit"><input id="priceUnit" name="priceUnit" className="input" placeholder="per kg" maxLength={30} /></Field>
          </div>
        </ActionForm>
      </section>
      <section className="mt-6" aria-labelledby="list">
        <h2 id="list" className="mb-3 text-lg font-extrabold">Your products</h2>
        {rows.length === 0 ? <p className="card p-5 text-sm text-muted">Nothing listed yet.</p> : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span><strong>{r.product.name}</strong> <span className="text-muted">· {r.branch?.branchName ?? "All branches"}</span></span>
                <span className="flex items-center gap-3"><span className="text-muted">{r.priceSen != null ? `${formatMyr(r.priceSen)} ${r.priceUnit ?? ""}` : "No price"}</span>
                  <form action={removeProductAction.bind(null, r.id)}><button className="text-chili-700 underline">Remove</button></form></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
