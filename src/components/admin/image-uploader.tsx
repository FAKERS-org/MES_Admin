import { Upload, X } from "lucide-react";
import { ChangeEvent, DragEvent, useState } from "react";

import { cn } from "@/lib/utils";
import { uploadImageToR2 } from "@/lib/utils/upload-to-r2";

export function ImageUploader({
  value,
  onChange,
  label = "Upload image",
  hint = "PNG, JPG, or WebP",
  previewClassName,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  previewClassName?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const id = `uploader-${label.toLowerCase().replace(/\s+/g, "-")}`;

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadImageToR2(file);
      onChange(publicUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file);
    e.target.value = "";
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  async function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await upload(file);
  }

  function clear() {
    onChange("");
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        id={id}
      />
      <label
        htmlFor={id}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-4 text-sm font-medium text-muted-foreground transition-colors",
          dragging
            ? "border-primary bg-primary/5 text-foreground"
            : "hover:bg-accent hover:text-foreground",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="size-5" />
        <span>{uploading ? "Uploading…" : label}</span>
<span className="text-[11px] text-muted-foreground">{hint}</span>
      </label>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

      {value ? (
        <div className={cn("relative", previewClassName)}>
          <img
            src={value}
            alt="Preview"
            className="h-24 w-full rounded border object-contain"
          />
          <button
            type="button"
            onClick={clear}
            aria-label="Remove image"
            className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}