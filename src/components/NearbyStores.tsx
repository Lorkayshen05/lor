"use client";
import { useState } from "react";
import type { StoreCard as Store } from "@/lib/queries/stores";
import { StoreCard } from "./StoreCard";

export function NearbyStores({ initial, fallbackLabel }: { initial: Store[]; fallbackLabel: string }) {
  const [stores, setStores] = useState(initial);
  const [label, setLabel] = useState(fallbackLabel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function locate() {
    setError(null);
    if (!("geolocation" in navigator)) return setError("Your browser doesn't support location.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/stores/nearby?lat=${pos.coords.latitude.toFixed(4)}&lng=${pos.coords.longitude.toFixed(4)}`);
          if (!res.ok) throw new Error();
          const data = (await res.json()) as { stores: Store[] };
          setStores(data.stores);
          setLabel("Nearest to your location (straight-line distance)");
        } catch {
          setError("Couldn't load nearby stores. Please try again.");
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setError("Location access was denied. You can still browse by area below.");
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <button type="button" onClick={locate} disabled={busy} className="btn btn-outline btn-sm">
          <span aria-hidden="true">📍</span> {busy ? "Locating…" : "Use my location"}
        </button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-chili-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => <StoreCard key={s.id} store={s} />)}
      </div>
    </div>
  );
}
