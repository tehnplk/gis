"use client";

import { useState } from "react";
import { useMapEvents } from "react-leaflet";

export default function MapReadout() {
  const [zoom, setZoom] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  // เก็บ state ไว้ในคอมโพเนนต์นี้เอง เพราะ mousemove ยิงถี่มาก
  // ถ้ายกขึ้นไปไว้ที่ AccidentMap จะทำให้ marker ทั้งหมด re-render ตาม
  const map = useMapEvents({
    mousemove(event) {
      setCursor({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    mouseout() {
      setCursor(null);
    },
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  return (
    // pointer-events-none เพื่อไม่ให้แย่งการลาก/ซูมของแผนที่
    <div className="pointer-events-none absolute bottom-7 left-2 z-[800] rounded-md border border-black/15 bg-white/95 px-2 py-1 font-mono text-[11px] leading-tight text-neutral-900 shadow-sm">
      <span>Zoom : {zoom ?? map.getZoom()}</span>
      <span className="mx-1.5 text-neutral-400">,</span>
      <span>
        Point{" "}
        {cursor
          ? `${cursor.lat.toFixed(5)} , ${cursor.lng.toFixed(5)}`
          : "— , —"}
      </span>
    </div>
  );
}
