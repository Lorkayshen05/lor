"use client";
import { useEffect } from "react";
import { track, type ClientEvent } from "@/lib/track-client";

/** Records one event when the page mounts (page view, store view, search). */
export function Track(props: ClientEvent) {
  const key = JSON.stringify(props);
  useEffect(() => {
    track(JSON.parse(key));
  }, [key]);
  return null;
}
