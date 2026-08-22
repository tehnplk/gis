import type { DefaultSession } from "next-auth";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
    providerId?: string;
    hoscode?: string | null;
    hname?: string | null;
  }

  interface Session {
    user: {
      role?: string;
      providerId?: string;
      hoscode?: string | null;
      hname?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    providerId?: string;
    hoscode?: string | null;
    hname?: string | null;
  }
}
