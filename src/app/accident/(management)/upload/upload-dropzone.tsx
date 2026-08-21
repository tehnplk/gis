"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (!file || !inputRef.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFileName(file.name);
  }

  return (
    <label
      htmlFor="accident-xlsx"
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      className={`group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-sky-600 focus-within:ring-offset-2 ${
        isDragging
          ? "border-sky-600 bg-sky-100"
          : "border-sky-300 bg-sky-50 hover:border-sky-500 hover:bg-sky-100"
      }`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-sky-800 shadow-sm ring-1 ring-sky-100 transition-transform group-hover:-translate-y-0.5">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-none stroke-current stroke-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </svg>
      </span>

      {fileName ? (
        <>
          <span className="mt-4 block break-all text-sm font-semibold text-sky-950">{fileName}</span>
          <span className="mt-1 block text-xs text-sky-700">ลากไฟล์ใหม่มาวาง หรือคลิกเพื่อเปลี่ยนไฟล์</span>
        </>
      ) : (
        <>
          <span className="mt-4 block text-sm font-semibold text-sky-950">ลากไฟล์ .xlsx มาวางที่นี่</span>
          <span className="mt-1 block text-xs text-sky-700">หรือคลิกบริเวณนี้เพื่อเลือกไฟล์</span>
        </>
      )}

      <input
        ref={inputRef}
        id="accident-xlsx"
        name="file"
        type="file"
        accept={`.xlsx,${XLSX_MIME}`}
        required
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
