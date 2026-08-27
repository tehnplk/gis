import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { getSession, signIn, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ — EMS - GIS",
  description: "สสจ.พิษณุโลก",
};

const DEFAULT_CALLBACK_URL = "/ems";

/**
 * รับเฉพาะ path ภายในเว็บนี้ กัน open redirect จาก callbackUrl ที่ผู้ใช้ส่งมาเอง
 * `//host` กับ `\host` ถูกเบราว์เซอร์ตีความเป็นโดเมนภายนอกได้ จึงต้องตัดทิ้งด้วย
 */
function localCallbackUrl(value: unknown) {
  const callbackUrl = String(value ?? "");
  return callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//") &&
    !callbackUrl.includes("\\")
    ? callbackUrl
    : DEFAULT_CALLBACK_URL;
}

/**
 * พาไปหน้า login ของ moph.id.th — ปลายทางกลับมาที่ /api/auth/healthid เสมอ
 * จึงต้องฝาก callbackUrl ไว้ใน cookie ก่อน ไม่งั้นหลัง login จะไม่รู้ว่าตั้งใจจะไปหน้าไหน
 */
async function providerLoginAction(formData: FormData) {
  "use server";

  const callbackUrl = localCallbackUrl(formData.get("callbackUrl"));
  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.HEALTH_REDIRECT_URI;
  if (!clientId || !redirectUri) redirect("/login?error=provider_config");

  const cookieStore = await cookies();
  cookieStore.set("provider_callback_url", callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const url = new URL("https://moph.id.th/oauth/redirect");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  redirect(url.toString());
}

/** ให้ผู้ใช้ role guest ออกจากระบบเพื่อลองบัญชีอื่นได้ ไม่งั้นจะติดค้างอยู่หน้านี้ */
async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

async function loginAction(formData: FormData) {
  "use server";

  const callbackUrl = localCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    // signIn โยน redirect ออกมาตอนสำเร็จ จึงจับเฉพาะ AuthError เท่านั้น
    if (error instanceof AuthError) {
      redirect(
        `/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    }
    throw error;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  "1": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  provider_config: "ยังไม่ได้ตั้งค่า HEALTH_CLIENT_ID / HEALTH_REDIRECT_URI ในไฟล์ .env",
  provider_missing_code: "ไม่ได้รับรหัสยืนยันจาก Health ID กรุณาลองใหม่อีกครั้ง",
  provider_not_allowed: "ProviderID นี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบ",
  provider_failed: "เชื่อมต่อ ProviderID ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  guest: "บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
};

const FIELD_CLASS =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 " +
  "outline-none transition-colors focus-visible:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-700/30";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = localCallbackUrl(params?.callbackUrl);
  const error = typeof params?.error === "string" ? params.error : "";

  const session = await getSession();
  // role guest เข้าหน้าไหนก็ไม่ได้ proxy จึงส่งกลับมาที่นี่เสมอ
  // ถ้า redirect ต่อจะวนไม่รู้จบจนเปิดเว็บไม่ได้เลย ต้องหยุดไว้แล้วแสดงสถานะแทน
  const isGuest = session?.user?.role === "guest";
  // เข้าสู่ระบบอยู่แล้วและมีสิทธิ์จริง ไม่ต้องเห็นฟอร์มอีก ส่งไปหน้าที่ตั้งใจจะไปเลย
  if (session?.user && !isGuest) redirect(callbackUrl);

  const errorMessage = isGuest
    ? ERROR_MESSAGES.guest
    : error
      ? (ERROR_MESSAGES[error] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      : "";

  // ไม่ได้ตั้งรหัสผ่านใน .env = ปิดการเข้าสู่ระบบ ต้องบอกให้ชัดว่าเพราะอะไร
  const loginEnabled = Boolean(process.env.SUPER_USER_PASSWORD?.trim());
  const providerEnabled = Boolean(
    process.env.HEALTH_CLIENT_ID && process.env.HEALTH_REDIRECT_URI,
  );

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">EMS - GIS</h1>
          <p className="mt-1 text-sm text-slate-500">
            สสจ.พิษณุโลก — สำหรับเจ้าหน้าที่
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        {isGuest ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              เข้าสู่ระบบในชื่อ{" "}
              <span className="font-medium text-slate-900">
                {session?.user?.name}
              </span>
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-11 w-full cursor-pointer rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-colors outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-700/40"
              >
                ออกจากระบบ แล้วเข้าด้วยบัญชีอื่น
              </button>
            </form>
          </div>
        ) : (
          <>
        {providerEnabled && (
          <form action={providerLoginAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-sky-800 bg-white text-sm font-medium text-sky-900 transition-colors outline-none hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-700/40"
            >
              เข้าระบบด้วย ProviderID
            </button>
          </form>
        )}

        {providerEnabled && loginEnabled && (
          <div className="my-5 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">หรือ</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        )}

        {loginEnabled ? (
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <label className="block text-sm font-medium text-slate-700">
              ชื่อผู้ใช้
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                className={`mt-1.5 ${FIELD_CLASS}`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              รหัสผ่าน
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`mt-1.5 ${FIELD_CLASS}`}
              />
            </label>

            <button
              type="submit"
              className="h-11 w-full cursor-pointer rounded-md bg-sky-800 text-sm font-medium text-white transition-colors outline-none hover:bg-sky-900 focus-visible:ring-2 focus-visible:ring-sky-700/40"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ยังไม่ได้ตั้งค่า SUPER_USER_PASSWORD ในไฟล์ .env
            จึงยังเข้าสู่ระบบไม่ได้
          </p>
        )}
          </>
        )}
      </section>
    </main>
  );
}
