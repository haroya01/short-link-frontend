import type { ThemeColors } from "../_lib/theme";

export function TextEntryHeader({ content, colors }: { content: string; colors: ThemeColors }) {
  return (
    <li className="pt-3 pb-1">
      <h2 className={`text-sm font-semibold ${colors.primary}`}>{content}</h2>
    </li>
  );
}
