"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

export function ModalSubmitButton({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto ${
        tone === "danger"
          ? "bg-red-700 hover:bg-red-800 focus-visible:ring-red-600"
          : "bg-sky-800 hover:bg-sky-900 focus-visible:ring-sky-600"
      }`}
    >
      {pending ? "กำลังบันทึก..." : children}
    </button>
  );
}

export function ModalCancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 sm:w-auto"
    >
      ยกเลิก
    </button>
  );
}

export function CrudModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    function focusableElements() {
      return Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const elements = focusableElements();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = requestAnimationFrame(() => {
      const preferred = panelRef.current?.querySelector<HTMLElement>("[autofocus]");
      (preferred ?? focusableElements()[0])?.focus();
    });

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-2 backdrop-blur-[2px] sm:p-4"
    >
      <div
        ref={panelRef}
        className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-5 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-slate-950">
              {title}
            </h3>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
