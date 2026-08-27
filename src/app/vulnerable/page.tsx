import type { Metadata } from "next";
import { getSession } from "@/auth";
import { StatusNotice } from "@/components/management-ui";
import { getVulnerableGroups, getVulnerablePins } from "./vulnerable-data";
import VulnerableView from "./vulnerable-view";

export const metadata: Metadata = {
  title: "GIS - กลุ่มเปราะบาง",
  description: "สสจ.พิษณุโลก",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** ค่าจาก query string อาจเป็น array ได้ถ้าใส่คีย์ซ้ำ — เอาตัวแรกพอ */
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VulnerablePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // proxy.ts กันไว้แล้วว่าต้องเข้าสู่ระบบก่อน ตรงนี้แค่ดึงข้อมูลมาแสดงบนอวาตาร์
  const [session, groups, pins, params] = await Promise.all([
    getSession(),
    getVulnerableGroups(),
    getVulnerablePins(),
    searchParams,
  ]);

  const success = first(params.success);
  const error = first(params.error);

  return (
    <main className="flex h-dvh min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 text-slate-950">
      <VulnerableView
        groups={groups}
        pins={pins}
        user={
          session?.user
            ? {
                name: session.user.name ?? "ผู้ใช้งาน",
                role: session.user.role,
              }
            : null
        }
        notice={
          success || error ? (
            <StatusNotice success={success} error={error} />
          ) : null
        }
      />
    </main>
  );
}
