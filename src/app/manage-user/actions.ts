"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  errorMessage,
  positiveId,
  statusUrl,
} from "@/lib/form-validation";
import { getSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ASSIGNABLE_ROLES, type AssignableRole } from "./roles";

const PATH = "/manage-user";

/**
 * proxy.ts กันไว้ชั้นหนึ่งแล้ว แต่ server action ถูกยิงตรงได้จากภายนอก
 * จึงต้องตรวจสิทธิ์ซ้ำในนี้ด้วยเสมอ ไม่พึ่ง middleware อย่างเดียว
 */
async function requireSuperUser() {
  const session = await getSession();
  if (session?.user?.role !== "super") {
    throw new Error("เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขสิทธิ์ผู้ใช้ได้");
  }
}

export async function updateUserRole(formData: FormData) {
  let failure: string | null = null;
  let message = "";

  try {
    await requireSuperUser();
    const id = positiveId(formData);
    const role = String(formData.get("role") ?? "");
    if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
      throw new Error("สิทธิ์ที่เลือกไม่ถูกต้อง");
    }

    const updated = await prisma.userProvider.update({
      where: { id },
      data: { role },
    });
    message = `ปรับสิทธิ์ ${updated.fullname ?? updated.provider_id} เป็น ${role} แล้ว`;
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  revalidatePath(PATH);
  redirect(statusUrl(PATH, "success", message));
}

export async function toggleUserActive(formData: FormData) {
  let failure: string | null = null;
  let message = "";

  try {
    await requireSuperUser();
    const id = positiveId(formData);
    const existing = await prisma.userProvider.findUnique({ where: { id } });
    if (!existing) throw new Error("ไม่พบผู้ใช้รายนี้");

    const updated = await prisma.userProvider.update({
      where: { id },
      data: { is_active: !existing.is_active },
    });
    const name = updated.fullname ?? updated.provider_id;
    message = updated.is_active
      ? `เปิดใช้งานบัญชี ${name} แล้ว`
      : `ปิดใช้งานบัญชี ${name} แล้ว`;
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  revalidatePath(PATH);
  redirect(statusUrl(PATH, "success", message));
}
