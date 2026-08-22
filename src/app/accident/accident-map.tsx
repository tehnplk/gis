"use client";

import "leaflet/dist/leaflet.css";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { AccidentPoint } from "./accident-data";
import type { BoundsTuple } from "./boundary-data";
import type { FocusRequest } from "./accident-view";
import BasemapSwitch from "./basemap-switch";
import { BASE_MAPS } from "./basemaps";
import BoundaryLayer from "./boundary-layer";
import { patientName } from "./format";
import MapControlPanel from "./map-control-panel";
import HeatmapLayer from "./heatmap-layer";
import { rescueIcon, riskIcon } from "./map-icons";
import MapReadout from "./map-readout";
import type { RescueBasePoint, RiskPointItem } from "./resource-data";
import {
  TRIAGE_LEVELS,
  type TriageLevel,
  triageColor,
  triageLabel,
} from "./triage";

/** กลางประเทศไทย (จ.นครสวรรค์) — ใช้เมื่อไม่มีจุดให้ fit */
const DEFAULT_CENTER: [number, number] = [15.7, 100.5];
const DEFAULT_ZOOM = 6;

/** ระดับซูมขั้นต่ำเมื่อ pan ไปยังจุดที่เลือกจากช่องค้นหา */
const FOCUS_ZOOM = 15;

/** รัศมีวงกลมจุดเกิดเหตุ (px) — ใหญ่กว่าไอคอนกู้ชีพ/จุดเสี่ยงเพราะเป็นชั้นข้อมูลหลัก */
const ACCIDENT_RADIUS = 11;

const DATETIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

type MarkerRefs = Map<number, LeafletCircleMarker>;

/**
 * ชั้นวางของ Leaflet ตามค่าเริ่มต้น: overlayPane (เส้น/วงกลม) = 400, markerPane (ไอคอน) = 600
 * ไอคอนกู้ชีพ/จุดเสี่ยงจึงลอยทับวงกลมจุดเกิดเหตุจนคลิกไม่โดน
 * แก้ด้วยการให้จุดเกิดเหตุมี pane ของตัวเองที่อยู่เหนือ markerPane
 */
const ACCIDENT_PANE = "accidentPoints";

/** สร้าง pane ตอน render เพื่อให้มีอยู่ก่อนที่ CircleMarker จะ mount */
function AccidentPane() {
  const map = useMap();

  if (!map.getPane(ACCIDENT_PANE)) {
    const pane = map.createPane(ACCIDENT_PANE);
    pane.style.zIndex = "650";
  }

  return null;
}

/** ระยะขอบรอบกรอบเมื่อจัดมุมมองตามขอบเขตการปกครอง */
const FIT_PADDING: [number, number] = [24, 24];

/**
 * คุมมุมมองตามอำเภอที่เลือก
 * - โหลดครั้งแรก: จัดให้พอดีทันที ไม่ต้องอนิเมชัน
 * - เปลี่ยนอำเภอทีหลัง: บินไปด้วยอนิเมชัน
 * - ไม่เลือกอำเภอ: กลับไปพอดีทั้งจังหวัด
 */
function DistrictFocus({
  provinceExtent,
  districtBounds,
  selectedDistrict,
  points,
}: {
  provinceExtent: BoundsTuple | null;
  districtBounds: Record<string, BoundsTuple>;
  selectedDistrict: string | null;
  points: AccidentPoint[];
}) {
  const map = useMap();
  // undefined = ยังไม่เคยจัดมุมมอง ใช้แยกครั้งแรกออกจากการเปลี่ยนอำเภอ
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const target =
      (selectedDistrict ? districtBounds[selectedDistrict] : null) ??
      provinceExtent;

    if (!target) {
      // ยังไม่ได้ import ขอบเขต จึงถอยไปใช้ขอบเขตของจุดแทน (ทำครั้งเดียว)
      if (previous.current === undefined && points.length > 0) {
        map.fitBounds(
          points.map((p) => [p.lat, p.lng] as [number, number]),
          { padding: [64, 64], maxZoom: 12 },
        );
        previous.current = selectedDistrict;
      }
      return;
    }

    if (previous.current === undefined) {
      map.fitBounds(target, { padding: FIT_PADDING });
    } else if (previous.current !== selectedDistrict) {
      map.flyToBounds(target, { padding: FIT_PADDING, duration: 0.9 });
    }

    previous.current = selectedDistrict;
  }, [map, selectedDistrict, districtBounds, provinceExtent, points]);

  return null;
}

/** เลื่อนแผนที่ไปยังจุดที่ผู้ใช้เลือกจาก autocomplete แล้วเปิด popup ให้ */
function PanToFocus({
  focus,
  markerRefs,
}: {
  focus: FocusRequest | null;
  markerRefs: React.RefObject<MarkerRefs>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;

    const { point } = focus;
    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), FOCUS_ZOOM), {
      duration: 0.8,
    });
    markerRefs.current.get(point.id)?.openPopup();
  }, [focus, map, markerRefs]);

  return null;
}

export default function AccidentMap({
  points,
  rescueBases,
  riskPoints,
  districtExtent,
  districtBounds,
  selectedDistrict,
  focus,
}: {
  points: AccidentPoint[];
  rescueBases: RescueBasePoint[];
  riskPoints: RiskPointItem[];
  districtExtent: BoundsTuple | null;
  districtBounds: Record<string, BoundsTuple>;
  selectedDistrict: string | null;
  focus: FocusRequest | null;
}) {
  const [activeId, setActiveId] = useState(BASE_MAPS[0].id);
  const [panelOpen, setPanelOpen] = useState(false);
  // เปิดเฉพาะชั้นข้อมูลหลักตอนโหลด ชั้นอื่นให้ผู้ใช้เปิดเองจากแผงควบคุม
  const [showAccidents, setShowAccidents] = useState(true);
  const [showRescue, setShowRescue] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  // เปิดขอบเขตอำเภอไว้ตั้งแต่ต้น ให้เห็นกรอบพื้นที่คู่กับจุดเกิดเหตุ
  const [showDistrictBoundary, setShowDistrictBoundary] = useState(true);
  const [showSubdistrictBoundary, setShowSubdistrictBoundary] = useState(false);
  const [hiddenTriage, setHiddenTriage] = useState<Set<string>>(() => new Set());
  const [drunkOnly, setDrunkOnly] = useState(false);
  const markerRefs = useRef<MarkerRefs>(new Map());

  // Keep the desktop panel open, but collapse it whenever the layout is mobile.
  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 640px)");
    const syncPanelToViewport = () => setPanelOpen(desktopQuery.matches);

    syncPanelToViewport();
    desktopQuery.addEventListener("change", syncPanelToViewport);
    return () => desktopQuery.removeEventListener("change", syncPanelToViewport);
  }, []);

  const active = useMemo(
    () => BASE_MAPS.find((m) => m.id === activeId) ?? BASE_MAPS[0],
    [activeId],
  );

  /** จำนวนจุดต่อระดับ triage ใช้แสดงข้างช่องติ๊ก */
  const countByTriage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const point of points) {
      const key = point.triage ?? "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [points]);

  const visiblePoints = useMemo(
    () =>
      points.filter(
        (p) =>
          !hiddenTriage.has(p.triage ?? "unknown") &&
          (!drunkOnly || p.drunk === true),
      ),
    [points, hiddenTriage, drunkOnly],
  );

  const drunkCount = useMemo(
    () => points.filter((p) => p.drunk === true).length,
    [points],
  );

  /** สรุปจำนวนฐานกู้ชีพตามระดับ ใช้แสดงใต้หัวข้อในแผง */
  const rescueByLevel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const base of rescueBases) {
      const key = base.level ?? "ไม่ระบุระดับ";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rescueBases]);

  const toggleTriage = (triage: TriageLevel | null) => {
    const key = triage ?? "unknown";
    setHiddenTriage((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const untriagedCount = countByTriage.get("unknown") ?? 0;

  /** ระดับ triage ทั้งหมดที่จะแสดงในแผง (รวม "ไม่ระบุ" เมื่อมีข้อมูล) */
  const triageRows: (TriageLevel | null)[] = [
    ...TRIAGE_LEVELS,
    ...(untriagedCount > 0 ? [null] : []),
  ];

  return (
    <>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="absolute inset-0"
      >
        <AccidentPane />

        {/* `key` บังคับให้ Leaflet สร้าง tile layer ใหม่เมื่อสลับแผนที่ฐาน */}
        <TileLayer
          key={active.id}
          attribution={active.attribution}
          url={active.url}
          maxZoom={active.maxZoom}
          subdomains={active.subdomains ?? "abc"}
        />

        {/* วางก่อนจุดข้อมูล เส้นขอบจึงอยู่ชั้นล่าง ไม่บังจุด */}
        <BoundaryLayer
          level="subdistrict"
          visible={showSubdistrictBoundary}
          onDarkBaseMap={active.dark === true}
        />
        <BoundaryLayer
          level="district"
          visible={showDistrictBoundary}
          onDarkBaseMap={active.dark === true}
        />

        {showAccidents &&
          visiblePoints.map((point) => (
            <CircleMarker
              key={point.id}
              ref={(marker) => {
                if (marker) markerRefs.current.set(point.id, marker);
                else markerRefs.current.delete(point.id);
              }}
              pane={ACCIDENT_PANE}
              center={[point.lat, point.lng]}
              radius={ACCIDENT_RADIUS}
              pathOptions={{
                color: "#ffffff",
                weight: 2.5,
                fillColor: triageColor(point.triage),
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">
                    {point.place ?? "ไม่ระบุสถานที่"}
                  </p>
                  {(point.subdistrict || point.district) && (
                    <p className="text-black/60">
                      {[
                        point.subdistrict && `ต.${point.subdistrict}`,
                        point.district && `อ.${point.district}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}
                  <p className="text-black/60">
                    {DATETIME_FORMAT.format(new Date(point.incidentDatetime))} น.
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block size-3 rounded-full border border-black/20"
                      style={{ backgroundColor: triageColor(point.triage) }}
                    />
                    <span>{triageLabel(point.triage)}</span>
                  </p>
                  <p className="text-black/60">
                    ดื่มสุรา:{" "}
                    {point.drunk === null
                      ? "ไม่ระบุ"
                      : point.drunk
                        ? "ใช่"
                        : "ไม่ใช่"}
                  </p>
                  {patientName(point) && (
                    <p className="text-black/60">
                      ผู้ประสบเหตุ: {patientName(point)}
                    </p>
                  )}
                  {point.hn && <p className="text-black/60">HN: {point.hn}</p>}
                  <p className="text-black/40">
                    {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {showRescue &&
          rescueBases.map((base) => (
            <Marker
              key={base.id}
              position={[base.lat, base.lng]}
              icon={rescueIcon}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{base.name}</p>
                  {base.level && (
                    <p className="text-black/60">ระดับหน่วย: {base.level}</p>
                  )}
                  {base.vehicleLevel && (
                    <p className="text-black/60">
                      ระดับรถ: {base.vehicleLevel}
                    </p>
                  )}
                  <p className="text-black/40">
                    {base.lat.toFixed(5)}, {base.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {showRisk &&
          riskPoints.map((risk) => (
            <Marker key={risk.id} position={[risk.lat, risk.lng]} icon={riskIcon}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{risk.placeName}</p>
                  {risk.note && <p className="text-black/60">{risk.note}</p>}
                  <p className="text-black/40">
                    {risk.lat.toFixed(5)}, {risk.lng.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        <HeatmapLayer points={visiblePoints} visible={showHeatmap} />

        <DistrictFocus
          provinceExtent={districtExtent}
          districtBounds={districtBounds}
          selectedDistrict={selectedDistrict}
          points={points}
        />
        <PanToFocus focus={focus} markerRefs={markerRefs} />
        <ScaleControl position="bottomleft" imperial={false} />
        <MapReadout />
      </MapContainer>

      {/* กรองแล้วไม่เจอข้อมูล ต้องบอกให้ชัด ไม่งั้นแผนที่ว่างจะดูเหมือนโหลดไม่ขึ้น */}
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[999] flex -translate-y-1/2 justify-center px-4">
          <p
            role="status"
            className="pointer-events-auto rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm shadow-lg dark:border-white/20 dark:bg-neutral-900"
          >
            ไม่พบจุดเกิดเหตุตามเงื่อนไขที่เลือก — ลองปรับตัวกรองด้านบน
          </p>
        </div>
      )}

      {/* แผงควบคุม วางนอก MapContainer เพื่อไม่ให้ event ตกไปที่แผนที่ */}
      <div className="pointer-events-none absolute top-2 right-2 left-14 z-[1000] flex max-h-[calc(100%-1rem)] flex-col items-stretch gap-2 sm:top-3 sm:right-3 sm:left-auto sm:max-h-[calc(100%-1.5rem)] sm:items-end">
        {/* แถวบน — สลับแผนที่ฐาน (อิสระ ไม่ยุบตามแผง) อยู่แถวเดียวกับปุ่มเปิด/ปิดแผง */}
        <div className="flex min-w-0 items-center gap-2">
          <BasemapSwitch activeId={active.id} onChange={setActiveId} />

          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            className="pointer-events-auto shrink-0 rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm font-medium whitespace-nowrap shadow-md hover:bg-neutral-100 sm:px-3 sm:py-1.5 dark:border-white/20 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            {panelOpen ? "ซ่อนแผงควบคุม ✕" : "ชั้นข้อมูล ☰"}
          </button>
        </div>

        {panelOpen && (
          <MapControlPanel
            showAccidents={showAccidents}
            onToggleAccidents={() => setShowAccidents((v) => !v)}
            accidentCount={points.length}
            visibleAccidentCount={visiblePoints.length}
            triageRows={triageRows}
            countByTriage={countByTriage}
            isTriageHidden={(triage) => hiddenTriage.has(triage ?? "unknown")}
            onToggleTriage={toggleTriage}
            triageKey={(triage) => triage ?? "unknown"}
            drunkOnly={drunkOnly}
            onToggleDrunkOnly={setDrunkOnly}
            drunkCount={drunkCount}
            showRescue={showRescue}
            onToggleRescue={() => setShowRescue((v) => !v)}
            rescueCount={rescueBases.length}
            rescueByLevel={rescueByLevel}
            showRisk={showRisk}
            onToggleRisk={() => setShowRisk((v) => !v)}
            riskCount={riskPoints.length}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap((v) => !v)}
            showDistrictBoundary={showDistrictBoundary}
            onToggleDistrictBoundary={() => setShowDistrictBoundary((v) => !v)}
            showSubdistrictBoundary={showSubdistrictBoundary}
            onToggleSubdistrictBoundary={() =>
              setShowSubdistrictBoundary((v) => !v)
            }
          />
        )}
      </div>
    </>
  );
}
