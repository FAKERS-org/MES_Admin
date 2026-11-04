import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Check,
    ExternalLink,
    HelpCircle,
    Mail,
    MessageSquare,
    Phone,
    X,
} from "lucide-react";
import React from "react";

export interface MetadataRendererProps {
    data?: Record<string, unknown> | null;
    title?: string;
    className?: string;
    emptyMessage?: string;
}

/** Formats a snake_case or kebab-case key into clean Title Case with acronym preservation. */
export function formatMetadataKey(key: string): string {
    const acronyms: Record<string, string> = {
        url: "URL",
        id: "ID",
        qr: "QR",
        moeys: "MoEYS",
        itc: "ITC",
        qa: "Q&A",
        faq: "FAQ",
        telegram: "Telegram",
        usd: "USD",
        khr: "KHR",
    };

    return key
        .split(/[_-]/)
        .filter(Boolean)
        .map(word => {
            const lower = word.toLowerCase();
            if (acronyms[lower]) return acronyms[lower];
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

/** Determines if a string is a valid web URL. */
function isWebUrl(val: string): boolean {
    return /^https?:\/\//i.test(val);
}

/** Determines if a string is an email address. */
function isEmail(val: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

/** Determines if a string is a phone number. */
function isPhoneNumber(val: string): boolean {
    return /^[+0-9\s().-]{7,20}$/.test(val) && /\d/.test(val);
}

/** Value renderer helper for primitive and structured values. */
function renderValue(key: string, val: unknown): React.ReactNode {
    if (val === null || val === undefined || val === "") {
        return <span className="text-muted-foreground/60 italic">—</span>;
    }

    if (typeof val === "boolean") {
        return val ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit">
                <Check className="size-3" /> Yes
            </Badge>
        ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs px-2 py-0.5 rounded-full font-normal flex items-center gap-1 w-fit">
                <X className="size-3" /> No
            </Badge>
        );
    }

    if (typeof val === "number") {
        return <span className="font-medium text-foreground">{val.toLocaleString()}</span>;
    }

    if (typeof val === "string") {
        const trimmed = val.trim();

        // Telegram link or username
        if (key.toLowerCase().includes("telegram") || trimmed.includes("t.me/")) {
            const username = trimmed.replace(/^https?:\/\/t\.me\//, "").replace(/^@/, "");
            const href = trimmed.startsWith("http") ? trimmed : `https://t.me/${username}`;
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline font-medium text-xs sm:text-sm"
                >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span>@{username}</span>
                    <ExternalLink className="size-3 opacity-70" />
                </a>
            );
        }

        // Web URL
        if (isWebUrl(trimmed)) {
            return (
                <a
                    href={trimmed}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium text-xs sm:text-sm break-all"
                >
                    <span className="truncate max-w-[260px]">{trimmed.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="size-3 shrink-0 opacity-70" />
                </a>
            );
        }

        // Email address
        if (isEmail(trimmed)) {
            return (
                <a
                    href={`mailto:${trimmed}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs sm:text-sm"
                >
                    <Mail className="size-3.5 shrink-0" />
                    <span>{trimmed}</span>
                </a>
            );
        }

        // Phone number
        if (isPhoneNumber(trimmed) && (key.toLowerCase().includes("phone") || key.toLowerCase().includes("tel") || key.toLowerCase().includes("contact"))) {
            return (
                <a
                    href={`tel:${trimmed.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium text-xs sm:text-sm"
                >
                    <Phone className="size-3.5 shrink-0" />
                    <span>{trimmed}</span>
                </a>
            );
        }

        // Multiline text
        if (trimmed.includes("\n")) {
            return <p className="whitespace-pre-line text-xs sm:text-sm text-foreground/90 leading-relaxed">{trimmed}</p>;
        }

        return <span className="text-xs sm:text-sm text-foreground">{trimmed}</span>;
    }

    if (Array.isArray(val)) {
        if (val.length === 0) {
            return <span className="text-muted-foreground/60 italic">None</span>;
        }

        // Array of primitive strings / numbers
        if (val.every(item => typeof item === "string" || typeof item === "number")) {
            return (
                <div className="flex flex-wrap gap-1.5">
                    {val.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5 rounded-md font-normal">
                            {String(item)}
                        </Badge>
                    ))}
                </div>
            );
        }

        // Array of objects
        return (
            <div className="space-y-2 mt-1">
                {val.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                        {typeof item === "object" && item !== null ? (
                            <MetadataRenderer data={item as Record<string, unknown>} />
                        ) : (
                            String(item)
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (typeof val === "object") {
        return (
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 mt-1">
                <MetadataRenderer data={val as Record<string, unknown>} />
            </div>
        );
    }

    return <span className="text-xs sm:text-sm text-foreground">{String(val)}</span>;
}

export function MetadataRenderer({
    data,
    title,
    className = "",
    emptyMessage,
}: MetadataRendererProps) {
    if (!data || Object.keys(data).length === 0) {
        if (!emptyMessage) return null;
        return (
            <div className={`p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground ${className}`}>
                {emptyMessage}
            </div>
        );
    }

    const entries = Object.entries(data);

    return (
        <Card className={`rounded-2xl border border-border shadow-xs bg-card p-4 sm:p-5 font-sans space-y-3.5 ${className}`}>
            {title && (
                <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                    <HelpCircle className="size-4 text-primary shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                        {title}
                    </h3>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {entries.map(([key, val]) => {
                    const label = formatMetadataKey(key);
                    const isLongText = typeof val === "string" && (val.length > 80 || val.includes("\n"));
                    const isComplex = Array.isArray(val) || (typeof val === "object" && val !== null);

                    return (
                        <div
                            key={key}
                            className={`p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col gap-1 ${
                                isLongText || isComplex ? "sm:col-span-2" : ""
                            }`}
                        >
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {label}
                            </span>
                            <div className="mt-0.5">{renderValue(key, val)}</div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

export default MetadataRenderer;
