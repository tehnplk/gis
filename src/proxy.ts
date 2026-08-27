import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEV_SKIP_AUTH } from "@/lib/dev-auth";

/**
 * ทั้งระบบต้องเข้าสู่ระบบก่อน — `/accident` ครอบคลุมหน้าจัดการทุกหน้าที่อยู่ใต้มันด้วย
 * (`/` redirect ไป `/portal` ซึ่งอยู่ในลิสต์นี้ จึงถูกกันไปในตัว)
 */
const PROTECTED_PAGE_PREFIXES = ["/portal", "/accident", "/manage-user"];

/**
 * API ตอบเป็น JSON 401/403 แทนการ redirect เพราะ fetch ฝั่ง client
 * จะตาม redirect ไปหน้า login แล้วได้ HTML กลับมา ทำให้ `response.json()` พังแบบหาสาเหตุยาก
 *
 * `/api/auth/*` ต้องเปิดไว้เสมอ ไม่งั้นจะเข้าสู่ระบบไม่ได้ตั้งแต่แรก
 */
const PROTECTED_API_PREFIXES = ["/api/boundaries"];

/** หน้าที่แก้สิทธิ์ผู้อื่นได้ — เปิดให้เฉพาะ role "super" (บัญชีใน .env) */
const SUPER_ONLY_PAGE_PREFIXES = ["/manage-user"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * `auth()` ถอด session จาก JWT ใน cookie ให้แล้ววางไว้ที่ `request.auth`
 * (auth.ts ตั้ง `session.strategy = "jwt"` จึงไม่ต้องแตะฐานข้อมูลในชั้นนี้เลย)
 */
export const proxy = auth((request) => {
  // โหมด dev ข้ามการตรวจทั้งหมด (ดู lib/dev-auth.ts) — เปิดหน้าไหนก็ได้โดยไม่ต้อง login
  if (DEV_SKIP_AUTH) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const isProtectedApi = matchesPrefix(pathname, PROTECTED_API_PREFIXES);
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);
  if (!isProtectedApi && !isProtectedPage) return NextResponse.next();

  const user = request.auth?.user;
  if (!user) {
    if (isProtectedApi) {
      return NextResponse.json(
        { message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.nextUrl);
    // จำหน้าที่ตั้งใจจะไป เพื่อพากลับมาหลังเข้าสู่ระบบสำเร็จ
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // ผู้ใช้ใหม่จาก ProviderID ได้ role "guest" ต้องให้ผู้ดูแลปรับเป็น user/admin ก่อน
  if (user.role === "guest") {
    if (isProtectedApi) {
      return NextResponse.json(
        { message: "บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน" },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/login?error=guest", request.nextUrl));
  }

  if (matchesPrefix(pathname, SUPER_ONLY_PAGE_PREFIXES) && user.role !== "super") {
    // ส่งไปหน้าที่เขาเข้าได้จริงพร้อมเหตุผล ไม่ส่งไป /login
    // เพราะคนที่ login อยู่แล้วจะถูกหน้า login เด้งกลับทันที ข้อความจึงไม่มีใครเห็น
    const url = new URL("/accident/upload", request.nextUrl);
    url.searchParams.set(
      "error",
      "เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าหน้าจัดการผู้ใช้ได้",
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
