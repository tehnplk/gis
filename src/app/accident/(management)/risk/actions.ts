"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  coordinate,
  errorMessage,
  optionalText,
  positiveId,
  requiredText,
  statusUrl,
} from "../validation";

const PATH = "/accident/risk";

function riskValues(formData: FormData) {
  return {
    placeName: requiredText(formData, "placeName", "ชื่อจุดเสี่ยง", 255),
    note: optionalText(formData, "note", "รายละเอียด", 5000),
    lat: coordinate(formData, "lat", "Latitude"),
    lng: coordinate(formData, "lng", "Longitude"),
  };
}

function refresh() {
  revalidatePath("/accident");
  revalidatePath(PATH);
}

export async function createRiskPoint(formData: FormData) {
  let failure: string | null = null;

  try {
    const values = riskValues(formData);
    await prisma.$executeRaw`
      INSERT INTO risk_point (place_name, note, coordinate)
      VALUES (
        ${values.placeName},
        ${values.note},
        ST_SetSRID(ST_MakePoint(${values.lng}, ${values.lat}), 4326)
      )
    `;
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "เพิ่มจุดเสี่ยงแล้ว"));
}

export async function updateRiskPoint(formData: FormData) {
  let failure: string | null = null;

  try {
    const id = positiveId(formData);
    const values = riskValues(formData);
    const changed = await prisma.$executeRaw`
      UPDATE risk_point
      SET
        place_name = ${values.placeName},
        note = ${values.note},
        coordinate = ST_SetSRID(ST_MakePoint(${values.lng}, ${values.lat}), 4326)
      WHERE id = ${id}
    `;
    if (changed === 0) throw new Error("ไม่พบจุดเสี่ยงที่ต้องการแก้ไข");
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "บันทึกการแก้ไขจุดเสี่ยงแล้ว"));
}

export async function deleteRiskPoint(formData: FormData) {
  let failure: string | null = null;

  try {
    const id = positiveId(formData);
    const changed = await prisma.$executeRaw`DELETE FROM risk_point WHERE id = ${id}`;
    if (changed === 0) throw new Error("ไม่พบจุดเสี่ยงที่ต้องการลบ");
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "ลบจุดเสี่ยงแล้ว"));
}
