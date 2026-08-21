import type { Metadata } from "next";
import { SubmitButton } from "../form-controls";
import { PageHeading, StatusNotice } from "../management-ui";
import { importAccidents } from "./actions";
import { UploadDropzone } from "./upload-dropzone";

export const metadata: Metadata = { title: "นำเข้าข้อมูลอุบัติเหตุ" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const COLUMNS = [
  ["incident_datetime", "บังคับ", "วันเวลาเกิดเหตุ เช่น 2026-08-22 14:30"],
  ["lat", "บังคับ", "Latitude ของจุดเกิดเหตุ"],
  ["lng", "บังคับ", "Longitude ของจุดเกิดเหตุ"],
  ["hn", "ไม่บังคับ", "เลข HN"],
  ["pname", "ไม่บังคับ", "คำนำหน้าชื่อ"],
  ["fname", "ไม่บังคับ", "ชื่อผู้ประสบเหตุ"],
  ["lname", "ไม่นำเข้า", "ระบบบันทึกเป็น นามสมมติ ทุกแถว"],
  ["place", "ไม่บังคับ", "สถานที่เกิดเหตุ"],
  ["district", "ไม่บังคับ", "อำเภอ"],
  ["subdistrict", "ไม่บังคับ", "ตำบล"],
  ["drunk", "ไม่บังคับ", "true/false, 1/0, yes/no หรือ ใช่/ไม่"],
  ["triage", "ไม่บังคับ", "black, red, orange, yellow หรือ green"],
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UploadPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return (
    <>
      <PageHeading
        eyebrow="XLSX Import"
        title="นำเข้าข้อมูลอุบัติเหตุ"
        description="ตรวจสอบข้อมูลจาก worksheet แรกและเพิ่มลงตาราง Accident แบบ transaction"
      />
      <StatusNotice success={first(params.success)} error={first(params.error)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">เลือกไฟล์ XLSX</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            สูงสุด 8 MB หรือ 5,000 แถว หากพบข้อมูลผิด ระบบจะไม่บันทึกทั้งไฟล์
          </p>

          <form action={importAccidents} className="mt-5">
            <UploadDropzone />

            <div className="mt-5 flex justify-end [&_button]:w-full sm:[&_button]:w-auto">
              <SubmitButton pendingLabel="กำลังตรวจและนำเข้า...">นำเข้าข้อมูล</SubmitButton>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-950">รูปแบบคอลัมน์</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">คอลัมน์</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COLUMNS.map(([name, status, description]) => (
                  <tr key={name}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-sky-900">{name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{status}</td>
                    <td className="px-4 py-3 leading-5 text-slate-600">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
