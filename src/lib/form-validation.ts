export function requiredText(formData: FormData, key: string, label: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`กรุณาระบุ${label}`);
  if (value.length > max) throw new Error(`${label}ยาวเกิน ${max} ตัวอักษร`);
  return value;
}

export function optionalText(formData: FormData, key: string, label: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) throw new Error(`${label}ยาวเกิน ${max} ตัวอักษร`);
  return value || null;
}

export function coordinate(formData: FormData, key: "lat" | "lng", label: string) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  const min = key === "lat" ? -90 : -180;
  const max = key === "lat" ? 90 : 180;

  if (!raw || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}ต้องเป็นตัวเลขระหว่าง ${min} ถึง ${max}`);
  }

  return value;
}

export function positiveId(formData: FormData) {
  const value = Number(formData.get("id"));
  if (!Number.isInteger(value) || value <= 0) throw new Error("รหัสข้อมูลไม่ถูกต้อง");
  return value;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้";
}

export function statusUrl(path: string, key: "success" | "error", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}
