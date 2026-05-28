/**
 * Shared label wrapper for BlockDialog form fields. Centralizes the label typography + required-
 * marker styling so every block editor renders fields identically — earlier each dialog kept its
 * own local {@code Field} helper which drifted into 3 slightly different styles (text-xs vs text-
 * [11px], `*` placement varied, `className` prop missing on some). One component, one rule.
 *
 * <p>Pass {@code className} to extend the wrapper (e.g. {@code sm:col-span-2} when the field
 * spans the full grid width in a multi-column form). The label itself is always the same.
 */
export function FormField({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
