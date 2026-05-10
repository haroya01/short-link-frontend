import type { CSSProperties } from "react";
import type { ThemeColors } from "../_lib/theme";

export function DividerEntry({
  colors,
  fadeStyle,
}: {
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
}) {
  return (
    <li className="profile-fade py-1.5" style={fadeStyle} aria-hidden="true">
      <hr className={`border-0 border-t ${colors.cardBorder}`} />
    </li>
  );
}
