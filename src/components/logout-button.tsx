"use client";

import { useTransition } from "react";
import { logoutAction } from "./auth-actions";

export default function LogoutButton({ username }: { username: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <span className="truncate text-sm text-sky-100">{username}</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => logoutAction())}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/40 bg-white/10 px-3 text-sm font-medium text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "กำลังออก…" : "ออกจากระบบ"}
      </button>
    </div>
  );
}
