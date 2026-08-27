"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type VulnerableMap from "./vulnerable-map";

// Leaflet เรียกใช้ `window` ตอน import จึงต้องปิด SSR
// (`ssr: false` ใช้ได้เฉพาะใน Client Component เท่านั้น)
const Map = dynamic(() => import("./vulnerable-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-200 text-sm text-slate-600">
      กำลังโหลดแผนที่...
    </div>
  ),
});

export default function MapLoader(props: ComponentProps<typeof VulnerableMap>) {
  return <Map {...props} />;
}
