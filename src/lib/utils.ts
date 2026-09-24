import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Human-readable API error: FastAPI returns `{"detail": ...}`, sometimes a Pydantic list. */
export function formatApiDetail(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown[] }).loc)
            ? (item as { loc: unknown[] }).loc.filter((p) => p !== "body").join(".")
            : "";
          return `${loc ? `${loc}: ` : ""}${String((item as { msg: string }).msg)}`;
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return null;
}

export function formatCurrency(amount?: number | null, currency?: string | null): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const symbol = currency === "KHR" ? "៛" : "$";
  const value = amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return currency === "KHR" ? `${value} ${symbol}` : `${symbol}${value}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
}
