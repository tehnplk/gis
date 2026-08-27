"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  coordinate,
  errorMessage,
  optionalText,
  positiveId,
  requiredText,
  statusUrl,
} from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";

const PATH = "/vulnerable";

/**
 * สีหมุดของแต่ละกลุ่ม — เลือกให้อัตโนมัติตอนสร้าง ผู้ใช้จึงกรอกแค่ชื่อกลุ่ม
 * ไล่ตามลำดับกลุ่มที่มีอยู่ เพื่อให้กลุ่มที่สร้างติดกันได้สีต่างกันชัดเจน
 */
const GROUP_COLORS = [
  "#0369a1", // ฟ้าเข้ม
  "#b45309", // ส้มเข้ม
  "#15803d", // เขียว
  "#7e22ce", // ม่วง
  "#be123c", // แดงชมพู
  "#0f766e", // เขียวน้ำทะเล
  "#a16207", // เหลืองเข้ม
  "#4338ca", // น้ำเงินคราม
];

function refresh() {
  revalidatePath(PATH);
}

export async function createVulnerableGroup(formData: FormData) {
  let failure: string | null = null;

  try {
    const name = requiredText(formData, "name", "ชื่อกลุ่ม", 120);
    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM vulnerable_group
    `;
    const color = GROUP_COLORS[Number(count) % GROUP_COLORS.length];

    const inserted = await prisma.$executeRaw`
      INSERT INTO vulnerable_group (name, color)
      VALUES (${name}, ${color})
      ON CONFLICT (name) DO NOTHING
    `;
    if (inserted === 0) throw new Error(`มีกลุ่ม "${name}" อยู่แล้ว`);
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "เพิ่มกลุ่มแล้ว"));
}

export async function deleteVulnerableGroup(formData: FormData) {
  let failure: string | null = null;

  try {
    const id = positiveId(formData);
    // ลบกลุ่มแล้วหมุดในกลุ่มจะหายตามไปด้วย (FK ON DELETE CASCADE)
    // จึงต้องบอกจำนวนให้ชัดก่อน ไม่ปล่อยให้ข้อมูลหายเงียบ ๆ
    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) AS count FROM vulnerable_point WHERE group_id = ${id}
    `;
    if (Number(count) > 0) {
      throw new Error(
        `กลุ่มนี้ยังมีหมุดอยู่ ${Number(count)} จุด กรุณาลบหมุดก่อนจึงจะลบกลุ่มได้`,
      );
    }

    const changed = await prisma.$executeRaw`DELETE FROM vulnerable_group WHERE id = ${id}`;
    if (changed === 0) throw new Error("ไม่พบกลุ่มที่ต้องการลบ");
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "ลบกลุ่มแล้ว"));
}

export async function createVulnerablePoint(formData: FormData) {
  let failure: string | null = null;

  try {
    const name = requiredText(formData, "name", "ชื่อหมุด", 255);
    const note = optionalText(formData, "note", "รายละเอียด", 5000);
    const lat = coordinate(formData, "lat", "Latitude");
    const lng = coordinate(formData, "lng", "Longitude");

    const groupId = Number(formData.get("groupId"));
    if (!Number.isInteger(groupId) || groupId <= 0) throw new Error("กรุณาเลือกกลุ่ม");

    const [group] = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM vulnerable_group WHERE id = ${groupId}
    `;
    if (!group) throw new Error("ไม่พบกลุ่มที่เลือก");

    await prisma.$executeRaw`
      INSERT INTO vulnerable_point (name, note, group_id, coordinate)
      VALUES (
        ${name},
        ${note},
        ${groupId},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "บันทึกหมุดแล้ว"));
}

export async function deleteVulnerablePoint(formData: FormData) {
  let failure: string | null = null;

  try {
    const id = positiveId(formData);
    const changed = await prisma.$executeRaw`DELETE FROM vulnerable_point WHERE id = ${id}`;
    if (changed === 0) throw new Error("ไม่พบหมุดที่ต้องการลบ");
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "ลบหมุดแล้ว"));
}
