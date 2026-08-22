"use client";

import { BOUNDARY_STYLE } from "./boundary-layer";
import { HEAT_GRADIENT_CSS } from "./heatmap-layer";
import { RESCUE_COLOR, RISK_COLOR } from "./map-icons";
import { type TriageLevel, triageColor, triageLabel } from "./triage";

const CARD =
  "pointer-events-auto min-h-0 w-full overflow-y-auto rounded-lg border border-black/15 bg-white p-3 shadow-lg sm:w-64 dark:border-white/20 dark:bg-neutral-900";
const HEADING =
  "mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/80";

type Props = {
  /** จุดเกิดเหตุ */
  showAccidents: boolean;
  onToggleAccidents: () => void;
  accidentCount: number;
  visibleAccidentCount: number;
  triageRows: (TriageLevel | null)[];
  countByTriage: Map<string, number>;
  isTriageHidden: (triage: TriageLevel | null) => boolean;
  onToggleTriage: (triage: TriageLevel | null) => void;
  triageKey: (triage: TriageLevel | null) => string;
  drunkOnly: boolean;
  onToggleDrunkOnly: (value: boolean) => void;
  drunkCount: number;

  /** จุดรถกู้ภัย */
  showRescue: boolean;
  onToggleRescue: () => void;
  rescueCount: number;
  rescueByLevel: [string, number][];

  /** จุดเสี่ยง */
  showRisk: boolean;
  onToggleRisk: () => void;
  riskCount: number;

  /** ความชุก (heatmap) */
  showHeatmap: boolean;
  onToggleHeatmap: () => void;

  /** ขอบเขตการปกครอง */
  showDistrictBoundary: boolean;
  onToggleDistrictBoundary: () => void;
  showSubdistrictBoundary: boolean;
  onToggleSubdistrictBoundary: () => void;
};

/** หัวข้อของแต่ละชั้นข้อมูล พร้อมช่องเปิด/ปิดและจำนวน */
function LayerHeader({
  checked,
  onToggle,
  color,
  shape,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  color: string;
  shape: "circle" | "square" | "diamond";
  label: string;
  count: number;
}) {
  const shapeClass =
    shape === "circle"
      ? "rounded-full"
      : shape === "square"
        ? "rounded-[3px]"
        : "rounded-[2px] rotate-45";

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4"
      />
      <span
        aria-hidden
        className={`size-3 shrink-0 border border-black/20 dark:border-white/30 ${shapeClass}`}
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 truncate">{label}</span>
      <span className="tabular-nums text-foreground/70">{count}</span>
    </label>
  );
}

/** แถวชั้นขอบเขต — ตัวอย่างเส้นใช้สี/ลายเดียวกับที่วาดจริงบนแผนที่ */
function BoundaryRow({
  checked,
  onToggle,
  level,
  label,
  count,
}: {
  checked: boolean;
  onToggle: () => void;
  level: keyof typeof BOUNDARY_STYLE;
  label: string;
  count: number;
}) {
  const style = BOUNDARY_STYLE[level];

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4"
      />
      <svg aria-hidden width="24" height="12" className="shrink-0">
        <line
          x1="1"
          y1="6"
          x2="23"
          y2="6"
          stroke={style.color}
          strokeWidth={Math.max(style.weight, 1.5)}
          strokeLinecap="round"
          strokeDasharray={style.dashArray}
        />
      </svg>
      <span className="flex-1 truncate">{label}</span>
      <span className="tabular-nums text-foreground/70">{count}</span>
    </label>
  );
}

export default function MapControlPanel(props: Props) {
  const {
    showAccidents,
    onToggleAccidents,
    accidentCount,
    visibleAccidentCount,
    triageRows,
    countByTriage,
    isTriageHidden,
    onToggleTriage,
    triageKey,
    drunkOnly,
    onToggleDrunkOnly,
    drunkCount,
    showRescue,
    onToggleRescue,
    rescueCount,
    rescueByLevel,
    showRisk,
    onToggleRisk,
    riskCount,
    showHeatmap,
    onToggleHeatmap,
    showDistrictBoundary,
    onToggleDistrictBoundary,
    showSubdistrictBoundary,
    onToggleSubdistrictBoundary,
  } = props;

  return (
    <>
      <div className={CARD}>
        <h2 className={HEADING}>ชั้นข้อมูล</h2>

        <section>
          <LayerHeader
            checked={showAccidents}
            onToggle={onToggleAccidents}
            color="#dc2626"
            shape="circle"
            label="จุดเกิดเหตุ"
            count={accidentCount}
          />

          <div
            className={`mt-1.5 space-y-1 border-l border-black/10 pl-2.5 dark:border-white/15 ${
              showAccidents ? "" : "pointer-events-none opacity-55"
            }`}
          >
            <p className="flex justify-between text-[11px] text-foreground/70">
              <span>ระดับคัดแยก</span>
              <span className="tabular-nums">
                {visibleAccidentCount}/{accidentCount}
              </span>
            </p>

            {triageRows.map((level) => (
              <label
                key={triageKey(level)}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={!isTriageHidden(level)}
                  onChange={() => onToggleTriage(level)}
                  className="size-3.5"
                />
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full border border-black/20 dark:border-white/30"
                  style={{ backgroundColor: triageColor(level) }}
                />
                <span className="flex-1 truncate">{triageLabel(level)}</span>
                <span className="tabular-nums text-foreground/70">
                  {countByTriage.get(triageKey(level)) ?? 0}
                </span>
              </label>
            ))}

            <label className="flex cursor-pointer items-center gap-2 border-t border-black/10 pt-1.5 text-sm dark:border-white/15">
              <input
                type="checkbox"
                checked={drunkOnly}
                onChange={(e) => onToggleDrunkOnly(e.target.checked)}
                className="size-3.5"
              />
              <span className="flex-1">เฉพาะที่ดื่มสุรา</span>
              <span className="tabular-nums text-foreground/70">
                {drunkCount}
              </span>
            </label>
          </div>
        </section>

        <hr className="my-2.5 border-black/10 dark:border-white/15" />

        <section>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={onToggleHeatmap}
              className="size-4"
            />
            {/* แถบไล่สีทำหน้าที่เป็น legend ของความเข้ม */}
            <span
              aria-hidden
              className="h-3 w-6 shrink-0 rounded-[3px] border border-black/20 dark:border-white/30"
              style={{ backgroundImage: HEAT_GRADIENT_CSS }}
            />
            <span className="flex-1 truncate">ความชุก (heatmap)</span>
          </label>

          <p
            className={`mt-1 border-l border-black/10 pl-2.5 text-[11px] text-foreground/70 dark:border-white/15 ${
              showHeatmap ? "" : "opacity-55"
            }`}
          >
            ความหนาแน่นของจุดเกิดเหตุที่แสดงอยู่ — เบาบาง → หนาแน่น
          </p>
        </section>

        <hr className="my-2.5 border-black/10 dark:border-white/15" />

        <section>
          <LayerHeader
            checked={showRisk}
            onToggle={onToggleRisk}
            color={RISK_COLOR}
            shape="diamond"
            label="จุดเสี่ยง"
            count={riskCount}
          />
        </section>

        <hr className="my-2.5 border-black/10 dark:border-white/15" />

        <section>
          <LayerHeader
            checked={showRescue}
            onToggle={onToggleRescue}
            color={RESCUE_COLOR}
            shape="square"
            label="จุดรถกู้ภัย"
            count={rescueCount}
          />

          <div
            className={`mt-1.5 space-y-0.5 border-l border-black/10 pl-2.5 dark:border-white/15 ${
              showRescue ? "" : "opacity-55"
            }`}
          >
            {rescueByLevel.map(([level, count]) => (
              <p
                key={level}
                className="flex justify-between text-[11px] text-foreground/80"
              >
                <span>{level}</span>
                <span className="tabular-nums">{count}</span>
              </p>
            ))}
          </div>
        </section>

        <hr className="my-2.5 border-black/10 dark:border-white/15" />

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80">
            ขอบเขตการปกครอง
          </h3>

          <BoundaryRow
            checked={showDistrictBoundary}
            onToggle={onToggleDistrictBoundary}
            level="district"
            label="อำเภอ"
            count={9}
          />
          <BoundaryRow
            checked={showSubdistrictBoundary}
            onToggle={onToggleSubdistrictBoundary}
            level="subdistrict"
            label="ตำบล"
            count={93}
          />
        </section>
      </div>
    </>
  );
}
