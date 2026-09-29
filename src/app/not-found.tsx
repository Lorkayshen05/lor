import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <p className="text-5xl" aria-hidden="true">🧊</p>
      <h1 className="mt-4 text-3xl font-black">Page not found</h1>
      <p className="mt-2 text-muted">That page has gone missing — maybe it’s still in the freezer.</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/" className="btn btn-primary">Back to home</Link>
        <Link href="/stores" className="btn btn-outline">Browse stores</Link>
      </div>
    </div>
  );
}
