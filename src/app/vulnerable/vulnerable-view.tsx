"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CrudModal, ModalCancelButton, ModalSubmitButton } from "@/components/crud-modal";
import { SubmitButton } from "@/components/form-controls";
import {
  GHOST_BUTTON_CLASS,
  MapTopbar,
  TopbarCount,
} from "@/components/map-topbar";
import { Field, INPUT_CLASS, TEXTAREA_CLASS } from "@/components/management-ui";
import UserMenu from "@/components/user-menu";
import {
  createVulnerableGroup,
  createVulnerablePoint,
  deleteVulnerableGroup,
  deleteVulnerablePoint,
} from "./actions";
import MapLoader from "./map-loader";
import type { VulnerableGroup, VulnerablePin } from "./vulnerable-data";
import type { PickedPoint } from "./vulnerable-map";

function GroupPanel({
  groups,
  hidden,
  onToggle,
}: {
  groups: VulnerableGroup[];
  hidden: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-950">กลุ่มเปราะบาง</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          ตั้งชื่อกลุ่มเอง เช่น ผู้สูงอายุ ผู้ป่วยติดเตียง
        </p>
      </div>

      <form action={createVulnerableGroup} className="flex gap-2 px-4 py-3">
        <input
          name="name"
          required
          maxLength={120}
          placeholder="ชื่อกลุ่มใหม่"
          aria-label="ชื่อกลุ่มใหม่"
          className={INPUT_CLASS}
        />
        <SubmitButton pendingLabel="กำลังเพิ่ม...">เพิ่ม</SubmitButton>
      </form>

      {groups.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-slate-500">
          ยังไม่มีกลุ่ม — สร้างกลุ่มแรกก่อนจึงจะปักหมุดได้
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-200">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center gap-2 px-4 py-2.5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!hidden.has(group.id)}
                  onChange={() => onToggle(group.id)}
                  className="size-4 shrink-0 accent-sky-800"
                />
                <span
                  aria-hidden
                  className="size-3.5 shrink-0 rounded-full border border-white shadow"
                  style={{ background: group.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {group.name}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600">
                  {group.pointCount}
                </span>
              </label>

              <form action={deleteVulnerableGroup}>
                <input type="hidden" name="id" value={group.id} />
                <button
                  type="submit"
                  aria-label={"ลบกลุ่ม " + group.name}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <span aria-hidden>×</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PointForm({
  groups,
  point,
  onCancel,
}: {
  groups: VulnerableGroup[];
  point: PickedPoint;
  onCancel: () => void;
}) {
  return (
    <form action={createVulnerablePoint}>
      <div className="grid gap-4 px-5 py-5 sm:px-6">
        <input type="hidden" name="lat" value={point.lat} />
        <input type="hidden" name="lng" value={point.lng} />

        <Field label="ชื่อหมุด" htmlFor="pin-name" required>
          <input
            autoFocus
            id="pin-name"
            name="name"
            required
            maxLength={255}
            placeholder="เช่น บ้านนายสมชาย ใจดี"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="กลุ่ม" htmlFor="pin-group" required>
          <select
            id="pin-group"
            name="groupId"
            required
            defaultValue=""
            className={INPUT_CLASS}
          >
            <option value="" disabled>
              เลือกกลุ่ม
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="รายละเอียด" htmlFor="pin-note">
          <textarea
            id="pin-note"
            name="note"
            maxLength={5000}
            placeholder="ข้อมูลเพิ่มเติม เช่น ผู้ดูแล เบอร์ติดต่อ"
            className={TEXTAREA_CLASS}
          />
        </Field>

        <p className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
          พิกัด {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <ModalCancelButton onClick={onCancel} />
        <ModalSubmitButton>บันทึกหมุด</ModalSubmitButton>
      </div>
    </form>
  );
}

export default function VulnerableView({
  groups,
  pins,
  user,
  notice,
}: {
  groups: VulnerableGroup[];
  pins: VulnerablePin[];
  /** ผู้ใช้ที่เข้าสู่ระบบอยู่ ใช้แสดงอวาตาร์และเมนูบัญชีบน topbar เหมือนฝั่ง EMS */
  user: { name: string; role?: string } | null;
  /** ผลของ server action รอบล่าสุด (สำเร็จ/ผิดพลาด) วาดมาจาก server component */
  notice: ReactNode;
}) {
  const [placing, setPlacing] = useState(false);
  const [pending, setPending] = useState<PickedPoint | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  // server action ที่บันทึกเสร็จจะ revalidate แล้วส่ง pins ชุดใหม่ลงมา
  // ใช้จังหวะนั้นปิด modal เพราะฟอร์มถูก submit ไปแล้ว ไม่มีอะไรให้กรอกต่อ
  // (ปรับ state ระหว่าง render ตามแนวทาง React สำหรับ "รีเซ็ตเมื่อ prop เปลี่ยน"
  //  ทำใน useEffect จะเกิด render ซ้ำอีกรอบโดยไม่จำเป็น)
  const [renderedPins, setRenderedPins] = useState(pins);
  if (pins !== renderedPins) {
    setRenderedPins(pins);
    setPending(null);
    setPlacing(false);
  }

  const toggleGroup = useCallback((id: number) => {
    setHidden((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closeModal = useCallback(() => setPending(null), []);
  const visiblePins = pins.filter((pin) => !hidden.has(pin.groupId));
  const canPlace = groups.length > 0;

  return (
    <>
      <MapTopbar title="GIS - กลุ่มเปราะบาง">
        <button
          type="button"
          disabled={!canPlace}
          onClick={() => setPlacing((value) => !value)}
          title={canPlace ? undefined : "สร้างกลุ่มอย่างน้อยหนึ่งกลุ่มก่อนจึงจะปักหมุดได้"}
          aria-pressed={placing}
          className={`${GHOST_BUTTON_CLASS} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
            placing ? "bg-amber-400 text-slate-950 hover:bg-amber-400" : ""
          }`}
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 17.5s5.5-4.6 5.5-8.5a5.5 5.5 0 1 0-11 0c0 3.9 5.5 8.5 5.5 8.5Z" />
            <circle cx="10" cy="9" r="1.9" />
          </svg>
          {placing ? "ยกเลิกการปักหมุด" : "ปักหมุด"}
        </button>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <TopbarCount>
            <span className="font-semibold text-white">{visiblePins.length}</span>
            <span className="text-sky-100">
              {" / "}
              {pins.length} หมุด
            </span>
          </TopbarCount>

          {user && <UserMenu name={user.name} role={user.role} />}
        </div>
      </MapTopbar>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80 lg:overflow-y-auto">
          {notice}
          <GroupPanel groups={groups} hidden={hidden} onToggle={toggleGroup} />

          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-500 shadow-sm">
            {canPlace
              ? placing
                ? "ลากหมุดไปยังตำแหน่งที่ต้องการ (ลากชนขอบจอแล้วแผนที่จะเลื่อนตาม) แล้วคลิกที่หมุดเพื่อกรอกข้อมูล"
                : 'กดปุ่ม "ปักหมุด" ด้านบน แล้วลากหมุดไปยังตำแหน่งที่ต้องการ'
              : "สร้างกลุ่มอย่างน้อยหนึ่งกลุ่มก่อนจึงจะปักหมุดได้"}
          </p>
        </aside>

        <div className="min-h-[26rem] flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <MapLoader
            pins={visiblePins}
            picking={placing}
            onConfirm={setPending}
            renderPopup={(pin) => (
              <div className="min-w-44 space-y-1.5">
                <p className="text-sm font-semibold text-slate-950">{pin.name}</p>
                <p className="text-xs text-slate-600">
                  <span
                    aria-hidden
                    className="mr-1.5 inline-block size-2.5 rounded-full align-middle"
                    style={{ background: pin.color }}
                  />
                  {pin.groupName}
                </p>
                {pin.note && (
                  <p className="text-xs whitespace-pre-line text-slate-600">{pin.note}</p>
                )}
                <p className="font-mono text-[11px] text-slate-500">
                  {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
                </p>
                <form action={deleteVulnerablePoint} className="pt-1">
                  <input type="hidden" name="id" value={pin.id} />
                  <button
                    type="submit"
                    className="cursor-pointer text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                  >
                    ลบหมุดนี้
                  </button>
                </form>
              </div>
            )}
          />
        </div>
      </div>

      {pending && (
        <CrudModal
          title="เพิ่มหมุดกลุ่มเปราะบาง"
          description="กรอกชื่อหมุดและเลือกกลุ่มที่ต้องการบันทึก"
          onClose={closeModal}
        >
          <PointForm groups={groups} point={pending} onCancel={closeModal} />
        </CrudModal>
      )}
    </>
  );
}
