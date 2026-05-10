import type { ThemeColors } from "../_lib/theme";

export function DividerEntry({ colors }: { colors: ThemeColors }) {
  return (
    <li className="py-1.5" aria-hidden="true">
      <hr className={`border-0 border-t ${colors.cardBorder}`} />
    </li>
  );
}
