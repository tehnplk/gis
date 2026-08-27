"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngLiteral, Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import BasemapSwitch from "@/components/basemap-switch";
import { BASE_MAPS } from "@/lib/basemaps";
import type { VulnerablePin } from "./vulnerable-data";
import { dragPinIcon, groupPinIcon } from "./pin-icon";

/** ศูนย์กลาง จ.พิษณุโลก — ใช้เมื่อยังไม่มีหมุดให้ fit */
const DEFAULT_CENTER: [number, number] = [16.82, 100.26];
const DEFAULT_ZOOM = 10;

export type PickedPoint = { lat: number; lng: number };

/**
 * หน้านี้ใช้แผนที่ฐานแค่ 2 แบบ — ถนนไว้ดูชื่อซอย/ถนน ดาวเทียมไว้เทียบหลังคาบ้านจริง
 * โหมดมืดกับภูมิประเทศไม่ช่วยงานหาที่อยู่ จึงตัดออกให้แถบเลือกสั้นลง
 */
const MAPS = BASE_MAPS.filter((map) => map.id === "osm" || map.id === "satellite");

/** ป้าย "คลิกที่หมุดเพื่อบันทึกข้อมูล" หลังปล่อยหมุด — โชว์สั้น ๆ แล้วหายเอง */
const DROP_HINT_MS = 2000;

/**
 * หมุดสำหรับเลือกตำแหน่งในโหมดปักหมุด — ลากหมุดไปวางเองได้ตรง ๆ
 * `autoPan` ทำให้แผนที่เลื่อนตามเมื่อลากหมุดไปชนขอบจอ จึงลากข้ามพื้นที่ไกล ๆ ได้
 * และเมื่อปล่อยหมุด แผนที่จะ pan ให้หมุดกลับมาอยู่กลางจอเสมอ
 *
 * วางหมุดไว้กลางจอตอนเข้าโหมด (`map.getCenter()` ตอน mount) แล้วปล่อยให้ผู้ใช้ลากต่อ
 */
function DragPin({ onConfirm }: { onConfirm: (point: PickedPoint) => void }) {
  const map = useMap();
  const markerRef = useRef<LeafletMarker>(null);
  // ป้ายแนะนำมีไว้บอกวิธีครั้งแรกเท่านั้น พอผู้ใช้เริ่มลากก็แปลว่าเข้าใจแล้ว
  // ซ่อนทิ้งไปเลยไม่ต้องกลับมาบังแผนที่อีก จนกว่าจะเข้าโหมดปักหมุดรอบใหม่
  // (DragPin ถูก unmount ตอนออกจากโหมด state จึงรีเซ็ตเองอยู่แล้ว)
  const [hintDismissed, setHintDismissed] = useState(false);
  const [dropHint, setDropHint] = useState(false);
  const dropHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<LatLngLiteral>(() => {
    const center = map.getCenter();
    return { lat: center.lat, lng: center.lng };
  });

  // ออกจากโหมดปักหมุดกลางคัน timer ต้องไม่ค้างไปสั่ง setState ตอน component ถูกถอดแล้ว
  useEffect(() => () => {
    if (dropHintTimer.current) clearTimeout(dropHintTimer.current);
  }, []);

  return (
    <Marker
      ref={markerRef}
      draggable
      autoPan
      autoPanSpeed={14}
      position={position}
      icon={dragPinIcon}
      zIndexOffset={1000}
      eventHandlers={{
        dragstart: () => {
          setHintDismissed(true);
          setDropHint(false);
          if (dropHintTimer.current) clearTimeout(dropHintTimer.current);
        },
        dragend: () => {
          const latlng = markerRef.current?.getLatLng();
          if (!latlng) return;
          setPosition({ lat: latlng.lat, lng: latlng.lng });

          // บอกขั้นตอนถัดไปให้ตรงจังหวะที่ผู้ใช้เพิ่งวางหมุดเสร็จ แล้วเก็บป้ายเองใน 3 วินาที
          setDropHint(true);
          if (dropHintTimer.current) clearTimeout(dropHintTimer.current);
          dropHintTimer.current = setTimeout(() => setDropHint(false), DROP_HINT_MS);
          // ปล่อยหมุดแล้วเลื่อนแผนที่ให้หมุดกลับมาอยู่กลางจอเสมอ
          // ผู้ใช้จึงเห็นรอบ ๆ ตำแหน่งที่เลือกได้เต็มที่ และลากต่อได้ทุกทิศทาง
          map.panTo(latlng);
        },
        // Leaflet ไม่ยิง click หลังการลาก (ตรวจ `_moved` ให้แล้ว)
        // การคลิกจึงหมายถึง "ยืนยันตำแหน่งนี้" เสมอ
        click: () => {
          const latlng = markerRef.current?.getLatLng() ?? position;
          onConfirm({ lat: latlng.lat, lng: latlng.lng });
        },
      }}
    >
      {(dropHint || !hintDismissed) && (
        <Tooltip
          // เปลี่ยนข้อความคนละความหมาย ให้ Leaflet สร้างป้ายใหม่แทนการแก้ของเดิม
          key={dropHint ? "drop" : "intro"}
          permanent
          direction="bottom"
          offset={[0, 6]}
        >
          {dropHint
            ? "คลิกที่หมุดเพื่อบันทึกข้อมูล"
            : "ลากหมุดไปยังตำแหน่งที่ต้องการ แล้วคลิกที่หมุด"}
        </Tooltip>
      )}
    </Marker>
  );
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
  onConfirm,
  renderPopup,
}: {
  pins: VulnerablePin[];
  /** อยู่ในโหมดปักหมุด — แสดงหมุดที่ลากไปวางตำแหน่งได้ */
  picking: boolean;
  onConfirm: (point: PickedPoint) => void;
  renderPopup: (pin: VulnerablePin) => React.ReactNode;
}) {
  const icons = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof groupPinIcon>>();
    for (const pin of pins) {
      if (!cache.has(pin.color)) cache.set(pin.color, groupPinIcon(pin.color));
    }
    return cache;
  }, [pins]);

  const [basemapId, setBasemapId] = useState(MAPS[0].id);
  const basemap = useMemo(
    () => MAPS.find((map) => map.id === basemapId) ?? MAPS[0],
    [basemapId],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          key={basemap.id}
          url={basemap.url}
          attribution={basemap.attribution}
          maxZoom={basemap.maxZoom}
          subdomains={basemap.subdomains ?? "abc"}
        />
        <ScaleControl position="bottomleft" imperial={false} />
        <FitPins pins={pins} />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={icons.get(pin.color) ?? groupPinIcon(pin.color)}
          >
            <Popup>{renderPopup(pin)}</Popup>
          </Marker>
        ))}

        {picking && <DragPin onConfirm={onConfirm} />}
      </MapContainer>

      {/* วางนอก MapContainer เพื่อไม่ให้คลิกทะลุไปโดนแผนที่
          z สูงกว่าแผง control ของ Leaflet (1000) แต่ยังต่ำกว่า topbar (1200) */}
      <div className="pointer-events-none absolute top-2 right-2 left-14 z-[1000] flex justify-end sm:top-3 sm:right-3 sm:left-auto">
        <BasemapSwitch activeId={basemap.id} onChange={setBasemapId} maps={MAPS} />
      </div>
    </div>
  );
}
