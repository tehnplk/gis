"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { logoutAction } from "@/components/auth-actions";

/**
 * ตัวย่อบนอวาตาร์ — ชื่อไทยจาก ProviderID ไม่มีเว้นวรรค (เช่น "นายอุเทนจาดยางโทน")
 * การตัดคำแม่นๆ ต้องใช้ Intl.Segmenter ซึ่งหนักเกินความจำเป็น
 * จึงใช้อักษรตัวแรกที่ไม่ใช่สระ/วรรณยุกต์ ซึ่งอ่านออกในทางปฏิบัติ
 */
function avatarInitial(name: string) {
  const letter = Array.from(name).find(
    (character) => !/[ะ-ฺ็-๎\s]/.test(character),
  );
  return (letter ?? "?").toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  super: "ผู้ดูแลระบบ",
  admin: "ผู้ดูแล",
  user: "ผู้ใช้งาน",
  guest: "รออนุมัติสิทธิ์",
};

/** ลิงก์เฉพาะของแต่ละระบบที่วางไว้บนสุดของเมนู (EMS ส่ง "จัดการข้อมูล" เข้ามา) */
export type UserMenuLink = { href: string; label: string };

export default function UserMenu({
  name,
  role,
  links = [],
}: {
  name: string;
  role?: string;
  links?: UserMenuLink[];
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // คลิกนอกเมนูหรือกด Escape แล้วปิด — แพทเทิร์นเดียวกับช่องค้น HN
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`บัญชีผู้ใช้ ${name}`}
        title={name}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-sky-950 text-sm font-semibold text-white transition-colors outline-none hover:bg-sky-900 focus-visible:ring-2 focus-visible:ring-white/70 sm:size-9"
      >
        {avatarInitial(name)}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-[1100] mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="truncate text-sm font-medium">{name}</p>
            {role && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {ROLE_LABELS[role] ?? role}
              </p>
            )}
          </div>

          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {link.label}
            </Link>
          ))}

          {/* ทุกระบบใช้ topbar เดียวกัน จึงต้องมีทางกลับไปเลือกระบบอื่นเสมอ */}
          <Link
            href="/portal"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            เลือกระบบ
          </Link>

          {/* แก้สิทธิ์ผู้อื่นได้เฉพาะ super — proxy.ts กันซ้ำอีกชั้นอยู่แล้ว
              ซ่อนเมนูไว้เฉยๆ ไม่ใช่การป้องกัน แต่ไม่ควรโชว์ทางที่กดแล้วโดนเด้ง */}
          {role === "super" && (
            <Link
              href="/manage-user"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              จัดการผู้ใช้
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            onClick={() => startTransition(() => logoutAction())}
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
          >
            {isPending ? "กำลังออก…" : "ออกจากระบบ"}
          </button>
        </div>
      )}
    </div>
  );
}
