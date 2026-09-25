"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function UniversityAvatar({
    logoUrl,
    nameEn,
    abbreviation,
    className,
}: {
    logoUrl: string | null;
    nameEn: string;
    abbreviation: string | null;
    className?: string;
}) {
    const [failed, setFailed] = useState(!logoUrl);

    // Reset failure state when the url changes.
    useEffect(() => {
        setFailed(!logoUrl);
    }, [logoUrl]);

    const initials = (abbreviation ?? nameEn).slice(0, 2).toUpperCase();

    if (!failed && logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={nameEn}
                className={cn("size-9 shrink-0 rounded-md object-cover", className)}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <span
            className={cn(
                "grid size-9 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground",
                className,
            )}
        >
            {initials}
        </span>
    );
}