"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ defaultValue = "", compact = false }: { defaultValue?: string; compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function nearMe() {
    setError(null);
    if (!("geolocation" in navigator)) return setError("Your browser doesn't support location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        p.set("lat", pos.coords.latitude.toFixed(4)); // 4 dp ≈ 11 m; enough for sorting, no need for more
        p.set("lng", pos.coords.longitude.toFixed(4));
        p.set("sort", "distance");
        router.push(`/stores?${p.toString()}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Allow location access, or search by area instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <form action="/stores" method="get" role="search" className="w-full">
      <label htmlFor="q" className="sr-only">Search stores, meat, seafood, hotpot ingredients</label>
      <div className={compact ? "flex flex-col gap-2 sm:flex-row" : "flex flex-col gap-2 sm:flex-row"}>
        <input
          id="q" name="q" value={q} onChange={(e) => setQ(e.target.value)} type="search" autoComplete="off" maxLength={100}
          placeholder="Search stores, meat, seafood, hotpot ingredients..."
          className="input flex-1 !min-h-12 !rounded-xl shadow-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className="btn btn-accent flex-1 !min-h-12 sm:flex-none">Search</button>
          <button type="button" onClick={nearMe} disabled={locating} className="btn btn-outline flex-1 !min-h-12 sm:flex-none">
            <span aria-hidden="true">📍</span> {locating ? "Locating…" : "Near Me"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-chili-700">{error}</p>}
    </form>
  );
}
