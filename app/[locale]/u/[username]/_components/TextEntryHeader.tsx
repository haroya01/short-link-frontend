import type { CSSProperties } from "react";
import type { ThemeColors } from "../_lib/theme";

export function TextEntryHeader({
  content,
  colors,
  fadeStyle,
}: {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
}) {
  return (
    <li className="profile-fade pt-3 pb-1" style={fadeStyle}>
      <h2 className={`text-sm font-semibold ${colors.primary}`}>{content}</h2>
    </li>
  );
}
