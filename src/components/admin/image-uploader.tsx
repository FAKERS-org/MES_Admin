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
  abbreviation,
  purpose
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  previewClassName?: string;
  abbreviation: string;
  purpose: "logo" | "cover" | "avatar";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const id = `uploader-${label.toLowerCase().replace(/\s+/g, "-")}`;

  async function upload(file: File, options: { abbreviation: string; purpose: "logo" | "cover" | "avatar" }) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadImageToR2(file, options);
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
    await upload(file, { abbreviation, purpose });
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
    if (file) await upload(file, { abbreviation, purpose });
  }

  function clear() {
    onChange("");
  }

  return (
    <div className={cn("space-y-2", previewClassName)}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        id={id}
      />
      <div className="flex h-24 items-stretch gap-2">
        <label
          htmlFor={id}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground transition-colors",
            dragging
              ? "border-primary bg-primary/5 text-foreground"
              : "hover:bg-accent hover:text-foreground",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="size-4" />
          <span>{uploading ? "Uploading…" : label}</span>
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        </label>
        <div className="relative w-28 shrink-0">
          {value ? (
            <div className="relative h-full">
              <img
                src={value}
                alt="Preview"
                className="h-full w-full cursor-pointer rounded border object-contain"
                onClick={() => setFullscreen(true)}
              />
              <button
                type="button"
                onClick={clear}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full border border-input bg-card text-muted-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 text-[11px] text-muted-foreground">
              No preview
            </div>
          )}
        </div>
      </div>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

      {fullscreen && value ? (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 p-4"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={value}
            alt="Preview"
            className="max-h-full max-w-full rounded object-contain"
          />
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Close preview"
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}