import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  dirty?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, dirty, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        dirty && "border-amber-500/70 dark:border-amber-400/70 bg-amber-500/[0.03] ring-1 ring-amber-500/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  dirty?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, dirty, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        dirty && "border-amber-500/70 dark:border-amber-400/70 bg-amber-500/[0.03] ring-1 ring-amber-500/30",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  dirty?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, dirty, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-card bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat px-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        dirty && "border-amber-500/70 dark:border-amber-400/70 bg-amber-500/[0.03] ring-1 ring-amber-500/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium leading-none text-foreground", className)} {...props}>
      {children}
    </label>
  );
}

/** Label + control + hint/error, the standard form row. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  dirty,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  dirty?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
        {dirty ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  id,
  label,
  description,
  defaultChecked,
  name,
  dirty,
  className,
  onChange,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  name?: string;
  dirty?: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-input bg-card px-3 py-2.5 transition-colors",
        dirty && "border-amber-500/70 dark:border-amber-400/70 bg-amber-500/[0.03] ring-1 ring-amber-500/30",
        className,
      )}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-[var(--primary)]"
      />
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id} className="cursor-pointer">
            {label}
          </Label>
          {dirty ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved
            </span>
          ) : null}
        </div>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
