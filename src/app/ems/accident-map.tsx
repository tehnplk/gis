"use client";

import "leaflet/dist/leaflet.css";
import type { Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import BasemapSwitch from "@/components/basemap-switch";
import { BASE_MAPS } from "@/lib/basemaps";
import BoundaryLayer from "./boundary-layer";
import MapControlPanel from "./map-control-panel";
import HeatmapLayer from "./heatmap-layer";
import { cbdCode } from "./cbd";
import { clusterIcon } from "./cluster-icon";
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

/** รูปแบบวันที่แบบสั้นสำหรับตารางใน popup — ต้องพอดีหนึ่งบรรทัด */
const ROW_DATETIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

type MarkerRefs = Map<number, LeafletMarker>;

/** เหตุทั้งหมดที่ตกอยู่บนพิกัดเดียวกัน ยุบเป็นหมุดเดียว */
type AccidentCluster = {
  key: string;
  lat: number;
  lng: number;
  points: AccidentPoint[];
  triage: TriageLevel | null;
};

/**
 * สีหมุดใช้ระดับคัดแยกที่พบมากที่สุดในพิกัดนั้น
 * เมื่อจำนวนเท่ากันให้ระดับที่รุนแรงกว่าชนะ (TRIAGE_LEVELS เรียงจากรุนแรงไปเบา)
 * ผลคือสีหมุดไม่แกว่งตามลำดับข้อมูลที่ query คืนมา
 */
function dominantTriage(points: AccidentPoint[]): TriageLevel | null {
  const counts = new Map<string, number>();
  for (const point of points) {
    const key = point.triage ?? "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let best: TriageLevel | null = null;
  let bestCount = 0;
  for (const level of [...TRIAGE_LEVELS, null]) {
    const count = counts.get(level ?? "unknown") ?? 0;
    if (count > bestCount) {
      best = level;
      bestCount = count;
    }
  }
  return best;
}

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

/**
 * กดล้างตัวกรองแล้วดึงมุมมองกลับค่าเริ่มต้น (พอดีทั้งจังหวัด)
 *
 * DistrictFocus จัดมุมมองใหม่เฉพาะตอน "อำเภอที่เลือก" เปลี่ยน แต่การค้น HN
 * พาแผนที่ไปที่ซูม 15 โดยไม่แตะ URL เลย ปุ่มล้างตัวกรองจึงต้องมีสัญญาณของตัวเอง
 */
function ResetView({
  signal,
  provinceExtent,
}: {
  signal: number;
  provinceExtent: BoundsTuple | null;
}) {
  const map = useMap();
  // จำสัญญาณที่จัดการไปแล้ว กัน effect ทำงานซ้ำตอน provinceExtent ได้ identity ใหม่
  const handled = useRef(signal);

  useEffect(() => {
    if (handled.current === signal) return;
    handled.current = signal;

    map.closePopup();
    if (provinceExtent) {
      map.flyToBounds(provinceExtent, { padding: FIT_PADDING, duration: 0.9 });
    } else {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.9 });
    }
  }, [signal, map, provinceExtent]);

  return null;
}

/**
 * เลื่อนแผนที่ไปยังจุดที่ผู้ใช้เลือกจากช่องค้น HN แล้วเปิด popup ให้
 *
 * ไม่ได้เล็งไปที่หมุดตรงๆ เพราะ popup สูงหลายร้อยพิกเซลและงอกขึ้นด้านบนของหมุด
 * ถ้าวางหมุดไว้กลางจอ ตัว popup จะล้นออกนอกขอบบน จึงเลื่อนจุดกึ่งกลางแผนที่
 * ขึ้นไปเท่ากับระยะจากหมุดถึงกึ่งกลาง popup — ผลคือ popup มาอยู่กลางจอพอดี
 */
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
    const marker = markerRefs.current.get(point.id);
    const zoom = Math.max(map.getZoom(), FOCUS_ZOOM);

    if (!marker) {
      map.flyTo([point.lat, point.lng], zoom, { duration: 0.8 });
      return;
    }

    marker.openPopup();

    // รอหนึ่งเฟรมให้ popup วาดเสร็จก่อน ไม่งั้นวัดความสูงได้ 0
    const frame = requestAnimationFrame(() => {
      const center = map.project([point.lat, point.lng], zoom);
      const markerEl = marker.getElement();
      const popupEl = marker.getPopup()?.getElement();

      if (markerEl && popupEl) {
        const markerBox = markerEl.getBoundingClientRect();
        const popupBox = popupEl.getBoundingClientRect();
        // ระยะกึ่งกลางหมุด -> กึ่งกลาง popup เป็นพิกเซลของ DOM จึงคงที่ทุกระดับซูม
        const lift =
          markerBox.top +
          markerBox.height / 2 -
          (popupBox.top + popupBox.height / 2);
        center.y -= lift;
      }

      map.flyTo(map.unproject(center, zoom), zoom, { duration: 0.8 });
    });

    return () => cancelAnimationFrame(frame);
  }, [focus, map, markerRefs]);

  return null;
}

/** หนึ่งแท็บต่อหนึ่งระดับคัดแยกที่พบในพิกัดนั้น */
type TriageTab = {
  key: string;
  level: TriageLevel | null;
  points: AccidentPoint[];
};

/** รายละเอียดของทุกเหตุที่ตกอยู่บนพิกัดเดียวกัน แยกแท็บตามระดับคัดแยก */
function ClusterPopup({
  cluster,
  focusedId,
}: {
  cluster: AccidentCluster;
  /** เหตุที่ผู้ใช้เลือกจากช่องค้น HN — ใช้เปิดแท็บให้ถูกและไฮไลท์แถว */
  focusedId: number | null;
}) {
  const first = cluster.points[0];
  const total = cluster.points.length;
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());

  /** แสดงเฉพาะระดับที่มีข้อมูลจริงในพิกัดนี้ เรียงจากรุนแรงไปเบาตาม TRIAGE_LEVELS */
  const tabs = useMemo<TriageTab[]>(() => {
    const levels: (TriageLevel | null)[] = [...TRIAGE_LEVELS, null];
    return levels
      .map((level) => ({
        key: level ?? "unknown",
        level,
        points: cluster.points.filter((p) => p.triage === level),
      }))
      .filter((tab) => tab.points.length > 0);
  }, [cluster]);

  // เปิดที่ระดับซึ่งพบมากที่สุดก่อน เพราะเป็นตัวที่กำหนดสีหมุดอยู่แล้ว
  const [activeKey, setActiveKey] = useState(cluster.triage ?? "unknown");
  // ตัวกรองอาจทำให้แท็บที่เปิดค้างไว้หายไป จึงต้องถอยไปแท็บแรกเสมอ
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  const focused = focusedId
    ? cluster.points.find((point) => point.id === focusedId)
    : undefined;

  // เหตุที่เลือกอาจอยู่คนละแท็บกับที่เปิดค้างไว้ ต้องสลับแท็บให้เองก่อน
  // ไม่งั้นผู้ใช้ค้น HN แล้ว popup เปิดมาที่แท็บซึ่งไม่มีแถวนั้นอยู่เลย
  // ปรับ state ตอน render ตามแบบ "adjusting state on prop change" ของ React
  // ทำใน useEffect ไม่ได้ เพราะจะ render แท็บผิดหนึ่งเฟรมก่อนแล้วค่อยกระตุก
  const [syncedFocusId, setSyncedFocusId] = useState<number | null>(focusedId);
  if (focusedId !== syncedFocusId) {
    setSyncedFocusId(focusedId);
    if (focused) setActiveKey(focused.triage ?? "unknown");
  }

  // เลื่อนแถวที่ไฮไลท์เข้ามาในกรอบ เพราะตารางสูงจำกัดและมักมีหลายร้อยแถว
  useEffect(() => {
    if (!focusedId) return;
    rowRefs.current
      .get(focusedId)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedId, activeKey]);

  const area =
    [
      first?.subdistrict && `ต.${first.subdistrict}`,
      first?.district && `อ.${first.district}`,
    ]
      .filter(Boolean)
      .join(" ") || "ไม่ระบุพื้นที่";

  return (
    <div className="w-max max-w-[calc(100vw-5rem)] space-y-2 text-sm">
      <div>
        <p className="font-semibold">{area}</p>
        <p className="text-black/60">
          {total.toLocaleString("th-TH")} เหตุ ณ พิกัดนี้
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-black/10 pb-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            aria-pressed={tab.key === active?.key}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
              tab.key === active?.key
                ? "bg-black/10 font-semibold"
                : "hover:bg-black/5"
            }`}
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full border border-black/20"
              style={{ backgroundColor: triageColor(tab.level) }}
            />
            <span>{triageLabel(tab.level)}</span>
            <span className="tabular-nums text-black/50">
              {tab.points.length.toLocaleString("th-TH")}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-black/50">
                <th className="w-6 py-1 pr-1 font-medium">#</th>
                <th className="py-1 pr-2 font-medium whitespace-nowrap">
                  วัน-เวลา
                </th>
                <th className="py-1 pr-2 font-medium">CBD</th>
                <th className="py-1 pr-2 font-medium">สถานที่</th>
                <th className="py-1 pr-2 font-medium">HN</th>
                <th className="py-1 pr-2 font-medium">นำส่ง</th>
                <th className="py-1 font-medium whitespace-nowrap">ระดับชุด</th>
              </tr>
            </thead>
            <tbody>
              {active.points.map((point, index) => (
                <tr
                  key={point.id}
                  ref={(row) => {
                    if (row) rowRefs.current.set(point.id, row);
                    else rowRefs.current.delete(point.id);
                  }}
                  className={`border-t border-black/5 align-top ${
                    point.id === focusedId
                      ? "bg-sky-700/15 font-semibold ring-1 ring-sky-700/40"
                      : ""
                  }`}
                >
                  <td className="py-1 pr-1 tabular-nums text-black/40">
                    {index + 1}
                  </td>
                  <td className="py-1 pr-2 whitespace-nowrap tabular-nums">
                    {ROW_DATETIME_FORMAT.format(new Date(point.incidentDatetime))}
                  </td>
                  <td
                    className="py-1 pr-2 tabular-nums"
                    title={point.cbd ?? undefined}
                  >
                    {cbdCode(point.cbd) ?? "—"}
                  </td>
                  {/* คอลัมน์เดียวที่ยอมให้ตัดคำ ที่เหลือสั้นและต้องอ่านรวดเดียว */}
                  <td
                    className="max-w-[17rem] min-w-[7rem] py-1 pr-2 break-words"
                    title={point.place ?? undefined}
                  >
                    {point.place ?? "—"}
                  </td>
                  <td className="py-1 pr-2 tabular-nums">{point.hn ?? "—"}</td>
                  <td className="py-1 pr-2 tabular-nums">
                    {point.hospital ?? "—"}
                  </td>
                  <td className="py-1 whitespace-nowrap">
                    {point.teamLevel ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* บอกที่มาของพิกัดไว้ ไม่งั้นผู้ใช้จะเข้าใจว่าหมุดคือจุดเกิดเหตุจริง */}
      <p className="border-t border-black/10 pt-2 text-xs text-black/40">
        {cluster.lat.toFixed(5)}, {cluster.lng.toFixed(5)} — พิกัดระดับตำบล
        ไม่ใช่ตำแหน่งที่เกิดเหตุจริง
      </p>
    </div>
  );
}

export default function AccidentMap({
  points,
  rescueBases,
  riskPoints,
  districtExtent,
  districtBounds,
  selectedDistrict,
  focus,
  resetView,
}: {
  points: AccidentPoint[];
  rescueBases: RescueBasePoint[];
  riskPoints: RiskPointItem[];
  districtExtent: BoundsTuple | null;
  districtBounds: Record<string, BoundsTuple>;
  selectedDistrict: string | null;
  focus: FocusRequest | null;
  /** ตัวเลขที่เพิ่มขึ้นทุกครั้งที่กดล้างตัวกรอง */
  resetView: number;
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

  /**
   * ความชุกเป็นชั้นข้อมูลอิสระจากชั้นหมุด ปิดหมุดแล้วยังต้องดูความหนาแน่นได้
   * ปิดชั้นหมุด = ปลดติ๊กระดับคัดแยกทั้งหมด visiblePoints จึงว่าง
   * ถ้าใช้ชุดนั้นตรงๆ heatmap จะหายไปด้วย จึงถอยไปใช้ข้อมูลทั้งหมดแทน
   * (ยังเคารพตัวกรอง "เฉพาะที่ดื่มสุรา" เพราะเป็นตัวกรองของผู้ใช้เอง ไม่ใช่สวิตช์ชั้นข้อมูล)
   */
  const heatmapPoints = useMemo(
    () =>
      showAccidents
        ? visiblePoints
        : points.filter((p) => !drunkOnly || p.drunk === true),
    [showAccidents, visiblePoints, points, drunkOnly],
  );

  /**
   * ยุบจุดที่พิกัดตรงกันเป็นหมุดเดียว คิดใหม่ทุกครั้งที่ตัวกรองเปลี่ยน
   * ตัวเลขในหมุดจึงเป็นจำนวนเหตุ "หลังกรอง" เสมอ ไม่ใช่ยอดดิบ
   */
  const clusters = useMemo(() => {
    const groups = new Map<string, AccidentCluster>();

    for (const point of visiblePoints) {
      const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, lat: point.lat, lng: point.lng, points: [], triage: null };
        groups.set(key, group);
      }
      group.points.push(point);
    }

    for (const group of groups.values()) {
      // เรียงเหตุล่าสุดขึ้นก่อน (มาก -> น้อย)
      // เทียบเป็นตัวเลข ไม่ใช้ localeCompare เพราะ collation บางภาษาข้ามอักขระคั่น
      // แล้วอาจให้ลำดับที่ไม่ตรงกับเวลาจริง
      group.points.sort(
        (a, b) =>
          Date.parse(b.incidentDatetime) - Date.parse(a.incidentDatetime),
      );
      group.triage = dominantTriage(group.points);
    }

    return [...groups.values()];
  }, [visiblePoints]);

  const maxClusterCount = useMemo(
    () => clusters.reduce((max, c) => Math.max(max, c.points.length), 1),
    [clusters],
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

  /**
   * ปิดชั้นจุดเกิดเหตุแล้วให้ปลดติ๊กระดับคัดแยกทั้งหมดด้วย
   * ไม่งั้นแผงจะโชว์ว่าติ๊กครบทั้งที่แผนที่ไม่มีหมุดสักจุด
   * เปิดกลับมาก็ติ๊กคืนให้ครบ ผู้ใช้ไม่ต้องไล่ติ๊กใหม่ทีละระดับ
   */
  const toggleAccidents = () => {
    const next = !showAccidents;
    setShowAccidents(next);
    setHiddenTriage(next ? new Set() : new Set([...TRIAGE_LEVELS, "unknown"]));
  };

  const toggleTriage = (triage: TriageLevel | null) => {
    const key = triage ?? "unknown";
    const turningOn = hiddenTriage.has(key);

    setHiddenTriage((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

    // ติ๊กระดับใดกลับเข้ามาแปลว่าอยากเห็นหมุด จึงเปิดชั้นจุดเกิดเหตุให้เอง
    // ไม่งั้นติ๊กแล้วแผนที่ยังว่าง ผู้ใช้จะนึกว่าช่องติ๊กเสีย
    if (turningOn) setShowAccidents(true);
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
          clusters.map((cluster) => (
            <Marker
              key={cluster.key}
              ref={(marker) => {
                // ทุกเหตุในพิกัดนี้ชี้มาที่หมุดเดียวกัน ช่องค้นหาจึงเปิด popup ได้ทุกรายการ
                for (const point of cluster.points) {
                  if (marker) markerRefs.current.set(point.id, marker);
                  else markerRefs.current.delete(point.id);
                }
              }}
              pane={ACCIDENT_PANE}
              position={[cluster.lat, cluster.lng]}
              icon={clusterIcon({
                count: cluster.points.length,
                maxCount: maxClusterCount,
                triage: cluster.triage,
              })}
              // หมุดเล็กต้องอยู่บนหมุดใหญ่ ไม่งั้นถูกกลบจนคลิกไม่ได้
              zIndexOffset={-cluster.points.length}
            >
              <Popup minWidth={360} maxWidth={560}>
                <ClusterPopup
                  cluster={cluster}
                  focusedId={focus?.point.id ?? null}
                />
              </Popup>
            </Marker>
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

        <HeatmapLayer points={heatmapPoints} visible={showHeatmap} />

        <DistrictFocus
          provinceExtent={districtExtent}
          districtBounds={districtBounds}
          selectedDistrict={selectedDistrict}
          points={points}
        />
        <PanToFocus focus={focus} markerRefs={markerRefs} />
        <ResetView signal={resetView} provinceExtent={districtExtent} />
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
            onToggleAccidents={toggleAccidents}
            accidentCount={points.length}
            visibleAccidentCount={visiblePoints.length}
            clusterCount={clusters.length}
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
