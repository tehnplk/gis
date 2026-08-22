import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  registerProviderUser,
  verifyProviderProfile,
  type ProviderProfile,
} from "@/lib/provider-auth";

/**
 * บัญชีผู้ดูแลอ่านจาก .env ไม่ได้เก็บในฐานข้อมูล
 * ระบบนี้มีผู้ใช้เพียงกลุ่มเจ้าหน้าที่ สสจ. จึงยังไม่จำเป็นต้องมีตาราง user
 * ถ้าไม่ได้ตั้งรหัสผ่านไว้ จะเข้าสู่ระบบไม่ได้เลย (ปลอดภัยกว่าปล่อยรหัสว่าง)
 */
function configuredUser() {
  const username = process.env.SUPER_USER_NAME?.trim() || "admin";
  const password = process.env.SUPER_USER_PASSWORD?.trim();
  if (!password) return null;

  return { id: "admin", name: username, username, password, role: "super" };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 3,
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "ชื่อผู้ใช้", type: "text" },
        password: { label: "รหัสผ่าน", type: "password" },
        loginType: { type: "text" },
        profile: { type: "text" },
        signature: { type: "text" },
      },
      async authorize(credentials) {
        // เส้นทาง ProviderID — profile ถูกดึงมาแล้วที่ /api/auth/healthid
        // ที่นี่แค่ตรวจลายเซ็น HMAC ว่าเป็นของจริงจากฝั่งเรา ไม่ได้ถูกยัดมาเอง
        if (credentials?.loginType === "provider-id") {
          const serializedProfile = String(credentials?.profile ?? "");
          const signature = String(credentials?.signature ?? "");
          if (!verifyProviderProfile(serializedProfile, signature)) return null;

          try {
            const profile = JSON.parse(serializedProfile) as ProviderProfile;
            const providerUser = await registerProviderUser(profile);
            if (!providerUser) return null;

            return {
              id: providerUser.providerId,
              name: providerUser.fullname || providerUser.providerId,
              providerId: providerUser.providerId,
              hoscode: providerUser.hoscode,
              hname: providerUser.hname,
              role: providerUser.role,
            };
          } catch {
            return null;
          }
        }

        const account = configuredUser();
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (
          !account ||
          username !== account.username ||
          password !== account.password
        ) {
          return null;
        }

        return { id: account.id, name: account.name, role: account.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.providerId = user.providerId;
        token.hoscode = user.hoscode;
        token.hname = user.hname;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.providerId = token.providerId;
        session.user.hoscode = token.hoscode;
        session.user.hname = token.hname;
      }
      return session;
    },
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
});
