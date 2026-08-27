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
} from "@/lib/form-validation";

const PATH = "/ems/rescue";

function rescueValues(formData: FormData) {
  return {
    name: requiredText(formData, "name", "ชื่อจุดรถกู้ชีพ", 255),
    level: optionalText(formData, "level", "ระดับหน่วย", 50),
    vehicleLevel: optionalText(formData, "vehicleLevel", "ระดับรถ", 50),
    lat: coordinate(formData, "lat", "Latitude"),
    lng: coordinate(formData, "lng", "Longitude"),
  };
}

function refresh() {
  revalidatePath("/ems");
  revalidatePath(PATH);
}

export async function createRescueBase(formData: FormData) {
  let failure: string | null = null;

  try {
    const values = rescueValues(formData);
    await prisma.$executeRaw`
      INSERT INTO rescue_base (name, level, vehicle_level, coordinate)
      VALUES (
        ${values.name},
        ${values.level},
        ${values.vehicleLevel},
        ST_SetSRID(ST_MakePoint(${values.lng}, ${values.lat}), 4326)
      )
    `;
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "เพิ่มจุดรถกู้ชีพแล้ว"));
}

export async function updateRescueBase(formData: FormData) {
  let failure: string | null = null;

  try {
    const id = positiveId(formData);
    const values = rescueValues(formData);
    const changed = await prisma.$executeRaw`
      UPDATE rescue_base
      SET
        name = ${values.name},
        level = ${values.level},
        vehicle_level = ${values.vehicleLevel},
        coordinate = ST_SetSRID(ST_MakePoint(${values.lng}, ${values.lat}), 4326)
      WHERE id = ${id}
    `;
    if (changed === 0) throw new Error("ไม่พบจุดรถกู้ชีพที่ต้องการแก้ไข");
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "บันทึกการแก้ไขจุดรถกู้ชีพแล้ว"));
}

export async function deleteRescueBase(formData: FormData) {
  let failure: string | null = null;

  try {
    const id = positiveId(formData);
    const changed = await prisma.$executeRaw`DELETE FROM rescue_base WHERE id = ${id}`;
    if (changed === 0) throw new Error("ไม่พบจุดรถกู้ชีพที่ต้องการลบ");
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  refresh();
  redirect(statusUrl(PATH, "success", "ลบจุดรถกู้ชีพแล้ว"));
}
