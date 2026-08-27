import type { ReactNode } from "react";

export const INPUT_CLASS =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-200";

export const TEXTAREA_CLASS =
  "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-200";

export function PageHeading({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0 max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-sky-700 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {typeof count === "number" && (
        <div className="w-full rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-left sm:w-auto sm:text-right">
          <p className="text-2xl font-semibold tabular-nums text-sky-900">{count}</p>
          <p className="text-xs text-sky-700">รายการทั้งหมด</p>
        </div>
      )}
    </div>
  );
}

export function StatusNotice({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  if (!success && !error) return null;

  return (
    <div
      role="status"
      className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {error ?? success}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}
