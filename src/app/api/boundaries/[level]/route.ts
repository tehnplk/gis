import { NextResponse } from "next/server";
import { type BoundaryLevel, getBoundaryGeoJson } from "@/app/accident/boundary-data";

const LEVELS: BoundaryLevel[] = ["district", "subdistrict"];

/**
 * แยกเป็น route เพื่อให้โหลดตอนผู้ใช้เปิดชั้นข้อมูลจริงๆ เท่านั้น
 * ถ้าส่งไปกับหน้าเลย payload จะบวกเพิ่มทุกครั้งที่โหลดหน้า ทั้งที่ค่าเริ่มต้นคือปิดอยู่
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ level: string }> },
) {
  const { level } = await params;

  if (!LEVELS.includes(level as BoundaryLevel)) {
    return NextResponse.json({ error: "ไม่รู้จักชั้นข้อมูลนี้" }, { status: 404 });
  }

  const featureCollection = await getBoundaryGeoJson(level as BoundaryLevel);

  return NextResponse.json(featureCollection, {
    // ขอบเขตการปกครองแทบไม่เปลี่ยน แคชได้ยาว
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
