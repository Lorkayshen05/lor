"use client";
import { track, type ClientEvent } from "@/lib/track-client";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: ClientEvent };

/** A normal <a> that also records an analytics event on click (directions, call, WhatsApp, website, sponsored). */
export function TrackedLink({ event, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event);
        onClick?.(e);
      }}
    />
  );
}
