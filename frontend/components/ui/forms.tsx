import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Field({
  label,
  required,
  error,
  hint,
  className,
  labelClassName,
  labelAlign,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  labelClassName?: string;
  labelAlign?: "start" | "end";
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span
        className={cn(
          "mb-2 flex w-full items-center gap-1 text-sm font-semibold tracking-wide text-gray-900",
          labelAlign === "start" && "justify-start text-left rtl:justify-end rtl:text-left",
          labelAlign === "end" && "justify-end text-right rtl:justify-start rtl:text-right",
          !labelAlign && "justify-start text-start",
          labelClassName,
        )}
      >
        <span>{label}</span>
        {required ? <span className="text-base leading-none text-red-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-2 block text-sm font-medium text-red-400 arabic-auto">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-[13px] font-medium text-gray-500 arabic-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return (
    <input
      {...props}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all placeholder:font-medium placeholder:text-gray-600 focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10 arabic-auto arabic-placeholder",
        props.className,
      )}
    />
  );
});
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => {
  return (
    <select
      {...props}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10 arabic-auto arabic-placeholder [&>option]:bg-white [&>option]:font-medium",
        props.className,
      )}
    />
  );
});
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] font-medium text-gray-900 outline-none transition-all placeholder:font-medium placeholder:text-gray-600 focus:border-teal-500 focus:bg-gray-50 focus:ring-4 focus:ring-teal-500/10 arabic-auto arabic-placeholder",
        props.className,
      )}
    />
  );
});
Textarea.displayName = "Textarea";

/** Combined [CURRENCY | number-input] in a single box */
export const CurrencyAmountInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    currencyCode?: string;
    isRtl?: boolean;
  }
>(({ currencyCode = "JOD", isRtl = false, className, ...props }, ref) => {
  return (
    <div className="relative flex overflow-hidden rounded-xl border border-gray-200 bg-white transition-all focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
      {/* Currency badge — left side for LTR, right side for RTL */}
      <span
        className={cn(
          "flex shrink-0 items-center border-gray-200 bg-gray-50 px-3 text-[13px] font-bold uppercase tracking-wider text-gray-500",
          isRtl ? "order-last border-l" : "order-first border-r",
        )}
      >
        {currencyCode || "JOD"}
      </span>
      <input
        type="number"
        ref={ref}
        min="0"
        step="0.01"
        {...props}
        className={cn(
          "w-full min-w-0 bg-transparent px-4 py-3 text-[15px] font-medium text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-500",
          isRtl ? "text-right" : "text-left",
          className,
        )}
      />
    </div>
  );
});
CurrencyAmountInput.displayName = "CurrencyAmountInput";

