"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Modal({
    isOpen,
    onClose,
    title,
    icon,
    children,
    maxWidth = "max-w-xl",
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    maxWidth?: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full ${maxWidth} rounded-xl border bg-card p-6 shadow-xl animate-in fade-in-50`}>
                <div className="flex items-center justify-between pb-4 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        {icon}
                        {title}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="size-4" />
                    </Button>
                </div>
                <div className="pt-4">{children}</div>
            </div>
        </div>
    );
}
