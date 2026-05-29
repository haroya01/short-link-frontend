/**
 * Small uppercase label above a section block. Visually anchors each card so the page reads as
 * "profile / add link / feed" instead of three undifferentiated cards stacked together.
 */
export function SectionLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
