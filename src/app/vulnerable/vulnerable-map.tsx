"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { VulnerablePin } from "./vulnerable-data";
import { groupPinIcon, pendingPinIcon } from "./pin-icon";

/** ศูนย์กลาง จ.พิษณุโลก — ใช้เมื่อยังไม่มีหมุดให้ fit */
const DEFAULT_CENTER: [number, number] = [16.82, 100.26];
const DEFAULT_ZOOM = 10;

export type PickedPoint = { lat: number; lng: number };

function ClickPicker({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (point: PickedPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (enabled) onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

/** ขยับมุมมองให้เห็นหมุดทั้งหมดครั้งแรกที่โหลด ไม่แย่งการซูมของผู้ใช้หลังจากนั้น */
function FitPins({ pins }: { pins: VulnerablePin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;
    map.fitBounds(
      pins.map((pin) => [pin.lat, pin.lng] as [number, number]),
      { padding: [48, 48], maxZoom: 15 },
    );
    // ตั้งใจให้ทำงานครั้งเดียวตอน mount — ใส่ pins ใน deps จะเด้งมุมมองทุกครั้งที่เพิ่มหมุด
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export default function VulnerableMap({
  pins,
  picking,
  pending,
  onPick,
  renderPopup,
}: {
  pins: VulnerablePin[];
  /** คลิกบนแผนที่แล้วปักหมุดได้ (ปิดไว้เมื่อยังไม่มีกลุ่มให้เลือก) */
  picking: boolean;
  pending: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
  renderPopup: (pin: VulnerablePin) => React.ReactNode;
}) {
  const icons = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof groupPinIcon>>();
    for (const pin of pins) {
      if (!cache.has(pin.color)) cache.set(pin.color, groupPinIcon(pin.color));
    }
    return cache;
  }, [pins]);

  return (
    // react-leaflet ตั้ง className ให้ container แค่ตอนสร้าง เปลี่ยนทีหลังไม่มีผล
    // จึงสลับคลาสที่ div ที่ครอบอยู่แทน (นิยาม .pin-placing ไว้ใน globals.css)
    <div className={`h-full w-full ${picking ? "pin-placing" : ""}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <ScaleControl position="bottomleft" imperial={false} />
        <FitPins pins={pins} />
        <ClickPicker enabled={picking} onPick={onPick} />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={icons.get(pin.color) ?? groupPinIcon(pin.color)}
          >
            <Popup>{renderPopup(pin)}</Popup>
          </Marker>
        ))}

        {pending && (
          <Marker position={[pending.lat, pending.lng]} icon={pendingPinIcon} />
        )}
      </MapContainer>
    </div>
  );
}
