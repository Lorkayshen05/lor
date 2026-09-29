import { mapSearchUrl } from "@/lib/geo";

/**
 * Embeds by ADDRESS (not our approximate coordinates) so the pin is where Google resolves the address.
 * With NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY set we use the official Maps Embed API; otherwise the keyless embed.
 */
export function MapEmbed({ address, title }: { address: string; title: string }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const src = key
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(address)}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-pandan-50">
      <iframe
        title={`Map of ${title}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-64 w-full sm:h-80"
        allowFullScreen
      />
      <p className="px-3 py-2 text-xs text-muted">
        Map is located from the written address.{" "}
        <a className="font-semibold text-pandan-700 underline" href={mapSearchUrl(address)} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
      </p>
    </div>
  );
}
