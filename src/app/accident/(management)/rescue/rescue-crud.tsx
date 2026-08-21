"use client";

import { useCallback, useState } from "react";
import { CrudModal, ModalCancelButton, ModalSubmitButton } from "../crud-modal";
import type { RescueManagementRow } from "../management-data";
import { Field, INPUT_CLASS } from "../management-ui";
import { createRescueBase, deleteRescueBase, updateRescueBase } from "./actions";

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; row: RescueManagementRow }
  | { mode: "delete"; row: RescueManagementRow }
  | null;

function RescueForm({ row, onCancel }: { row?: RescueManagementRow; onCancel: () => void }) {
  const isEditing = Boolean(row);

  return (
    <form action={isEditing ? updateRescueBase : createRescueBase}>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
        {row && <input type="hidden" name="id" value={row.id} />}
        <div className="sm:col-span-2">
          <Field label="ชื่อจุดรถกู้ชีพ" htmlFor="rescue-name" required>
            <input
              autoFocus
              id="rescue-name"
              name="name"
              defaultValue={row?.name ?? ""}
              required
              maxLength={255}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="ระดับหน่วย" htmlFor="rescue-level">
          <input
            id="rescue-level"
            name="level"
            defaultValue={row?.level ?? ""}
            maxLength={50}
            placeholder="เช่น ALS, ILS, BLS"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="ระดับรถ" htmlFor="rescue-vehicle-level">
          <input
            id="rescue-vehicle-level"
            name="vehicleLevel"
            defaultValue={row?.vehicleLevel ?? ""}
            maxLength={50}
            placeholder="เช่น รถพยาบาลขั้นสูง"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Latitude" htmlFor="rescue-lat" required>
          <input
            id="rescue-lat"
            name="lat"
            type="number"
            step="any"
            min="-90"
            max="90"
            defaultValue={row?.lat ?? ""}
            required
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Longitude" htmlFor="rescue-lng" required>
          <input
            id="rescue-lng"
            name="lng"
            type="number"
            step="any"
            min="-180"
            max="180"
            defaultValue={row?.lng ?? ""}
            required
            className={INPUT_CLASS}
          />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <ModalCancelButton onClick={onCancel} />
        <ModalSubmitButton>
          {isEditing ? "บันทึกการแก้ไข" : "เพิ่มจุดรถกู้ชีพ"}
        </ModalSubmitButton>
      </div>
    </form>
  );
}

export function RescueCrud({ rows }: { rows: RescueManagementRow[] }) {
  const [modal, setModal] = useState<ModalState>(null);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-slate-950">รายการจุดรถกู้ชีพ</h3>
            <p className="mt-1 text-sm text-slate-500">จัดการหน่วยและรถกู้ชีพที่ใช้แสดงบนแผนที่</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: "create" })}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-sky-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
          >
            <span aria-hidden className="text-lg leading-none">+</span>
            เพิ่มจุดรถกู้ชีพ
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700">ยังไม่มีข้อมูลจุดรถกู้ชีพ</p>
            <p className="mt-1 text-sm text-slate-500">เริ่มต้นด้วยการเพิ่มจุดรถกู้ชีพรายการแรก</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">ชื่อจุดรถกู้ชีพ</th>
                  <th className="px-5 py-3 font-semibold">ระดับหน่วย</th>
                  <th className="px-5 py-3 font-semibold">ระดับรถ</th>
                  <th className="px-5 py-3 font-semibold">พิกัด</th>
                  <th className="px-5 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-4 font-semibold text-slate-950">{row.name}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {row.level ? (
                        <span className="rounded bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">
                          {row.level}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{row.vehicleLevel || "—"}</td>
                    <td className="px-5 py-4 font-mono text-xs whitespace-nowrap text-slate-600">
                      {row.lat?.toFixed(6) ?? "—"}, {row.lng?.toFixed(6) ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "edit", row })}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-sky-200 bg-white px-3 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "delete", row })}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal?.mode === "create" && (
        <CrudModal
          title="เพิ่มจุดรถกู้ชีพ"
          description="ระบุชื่อ ระดับหน่วย ระดับรถ และพิกัดให้ครบถ้วน"
          onClose={closeModal}
        >
          <RescueForm onCancel={closeModal} />
        </CrudModal>
      )}

      {modal?.mode === "edit" && (
        <CrudModal
          title="แก้ไขจุดรถกู้ชีพ"
          description={`ปรับปรุงข้อมูล “${modal.row.name}”`}
          onClose={closeModal}
        >
          <RescueForm row={modal.row} onCancel={closeModal} />
        </CrudModal>
      )}

      {modal?.mode === "delete" && (
        <CrudModal
          title="ยืนยันการลบจุดรถกู้ชีพ"
          description="รายการที่ลบแล้วจะไม่แสดงบนแผนที่อุบัติเหตุ"
          onClose={closeModal}
        >
          <form action={deleteRescueBase}>
            <input type="hidden" name="id" value={modal.row.id} />
            <div className="px-5 py-6 sm:px-6">
              <p className="text-sm leading-6 text-slate-700">
                ต้องการลบ <strong className="font-semibold text-slate-950">{modal.row.name}</strong> ใช่หรือไม่?
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <ModalCancelButton onClick={closeModal} />
              <ModalSubmitButton tone="danger">ลบจุดรถกู้ชีพ</ModalSubmitButton>
            </div>
          </form>
        </CrudModal>
      )}
    </>
  );
}
