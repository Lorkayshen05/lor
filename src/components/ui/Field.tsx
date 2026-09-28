import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-400";

interface FieldWrapperProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-800">
          {label}
          {required && <span className="text-brand-600"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && <p className="text-xs font-medium text-brand-600">{error}</p>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, className, id, required, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <input
        id={inputId}
        className={cn(controlClasses, error && "border-brand-400 focus:ring-brand-100", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldWrapper>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Textarea({ label, error, hint, className, id, required, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <textarea
        id={inputId}
        className={cn(controlClasses, "min-h-24 resize-y", error && "border-brand-400", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldWrapper>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Select({ label, error, hint, className, id, required, children, ...props }: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <select
        id={inputId}
        className={cn(controlClasses, "appearance-none bg-white", error && "border-brand-400", className)}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
