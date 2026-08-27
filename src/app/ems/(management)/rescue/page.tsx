import type { Metadata } from "next";
import { getRescueManagementRows } from "../management-data";
import { PageHeading, StatusNotice } from "../management-ui";
import { RescueCrud } from "./rescue-crud";

export const metadata: Metadata = { title: "จัดการจุดรถกู้ชีพ" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RescuePage({ searchParams }: { searchParams: SearchParams }) {
  const [rows, params] = await Promise.all([getRescueManagementRows(), searchParams]);

  return (
    <>
      <PageHeading
        eyebrow="Rescue Base Registry"
        title="จัดการจุดรถกู้ชีพ"
        description="ดูแลตำแหน่งหน่วยกู้ชีพ ระดับหน่วย และระดับรถที่แสดงบนแผนที่"
        count={rows.length}
      />
      <StatusNotice success={first(params.success)} error={first(params.error)} />
      <RescueCrud rows={rows} />
    </>
  );
}
