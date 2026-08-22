import type { Metadata } from "next";
import {
  PageHeading,
  StatusNotice,
} from "@/app/accident/(management)/management-ui";
import { prisma } from "@/lib/prisma";
import { toggleUserActive, updateUserRole } from "./actions";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "./roles";

export const metadata: Metadata = { title: "จัดการผู้ใช้" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const DATETIME_FORMAT = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const CELL = "px-3 py-2.5 align-middle";

export default async function ManageUserPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [rows, params] = await Promise.all([
    prisma.userProvider.findMany({ orderBy: { created_at: "desc" } }),
    searchParams,
  ]);

  return (
    <>
      <PageHeading
        eyebrow="ProviderID Accounts"
        title="จัดการผู้ใช้"
        description="ผู้ที่เข้าระบบด้วย ProviderID จะถูกสร้างบัญชีอัตโนมัติด้วยสิทธิ์ guest ซึ่งยังใช้งานไม่ได้ ต้องปรับเป็น user หรือ admin ที่นี่"
        count={rows.length}
      />
      <StatusNotice success={first(params.success)} error={first(params.error)} />

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          ยังไม่มีผู้ใช้ที่เข้าระบบด้วย ProviderID
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className={`${CELL} font-medium`}>ชื่อ</th>
                <th className={`${CELL} font-medium`}>ProviderID</th>
                <th className={`${CELL} font-medium`}>หน่วยบริการ</th>
                <th className={`${CELL} font-medium`}>เข้าใช้ล่าสุด</th>
                <th className={`${CELL} font-medium`}>สิทธิ์</th>
                <th className={`${CELL} font-medium`}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className={CELL}>
                    <p className="font-medium text-slate-900">
                      {row.fullname ?? "ไม่ระบุชื่อ"}
                    </p>
                    <p className="text-xs text-slate-500">
                      เข้าใช้ {row.login_count} ครั้ง
                    </p>
                  </td>
                  <td className={`${CELL} font-mono text-xs text-slate-600`}>
                    {row.provider_id}
                  </td>
                  <td className={CELL}>
                    <p className="text-slate-700">{row.hname ?? "—"}</p>
                    {row.hoscode && (
                      <p className="text-xs text-slate-500">{row.hoscode}</p>
                    )}
                  </td>
                  <td className={`${CELL} whitespace-nowrap text-slate-600`}>
                    {row.last_activity
                      ? DATETIME_FORMAT.format(row.last_activity)
                      : "—"}
                  </td>
                  <td className={CELL}>
                    {/* หนึ่งฟอร์มต่อหนึ่งแถว บันทึกทีละคน ไม่ต้องใช้ state ฝั่ง client */}
                    <form action={updateUserRole} className="flex gap-1.5">
                      <input type="hidden" name="id" value={row.id} />
                      <select
                        name="role"
                        defaultValue={row.role}
                        aria-label={`สิทธิ์ของ ${row.fullname ?? row.provider_id}`}
                        className="h-9 cursor-pointer rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-950 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-200"
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role] ?? role}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="h-9 shrink-0 cursor-pointer rounded-md bg-sky-800 px-3 text-sm font-medium text-white transition-colors hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        บันทึก
                      </button>
                    </form>
                  </td>
                  <td className={CELL}>
                    <form action={toggleUserActive}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className={`h-9 cursor-pointer rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                          row.is_active
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-300"
                            : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:ring-slate-300"
                        }`}
                      >
                        {row.is_active ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
