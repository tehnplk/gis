import type { Metadata } from "next";
import { getRiskManagementRows } from "../management-data";
import { PageHeading, StatusNotice } from "@/components/management-ui";
import { RiskCrud } from "./risk-crud";

export const metadata: Metadata = { title: "จัดการจุดเสี่ยง" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RiskPage({ searchParams }: { searchParams: SearchParams }) {
  const [rows, params] = await Promise.all([getRiskManagementRows(), searchParams]);

  return (
    <>
      <PageHeading
        eyebrow="Risk Point Registry"
        title="จัดการจุดเสี่ยง"
        description="เพิ่ม แก้ไข และลบตำแหน่งเสี่ยงที่แสดงบนแผนที่อุบัติเหตุ"
        count={rows.length}
      />
      <StatusNotice success={first(params.success)} error={first(params.error)} />
      <RiskCrud rows={rows} />
    </>
  );
}
