import Svg, { Line, Rect } from "react-native-svg";
import type { IssuePriority } from "@multica/core/types";
import { PRIORITY_CONFIG } from "@multica/core/issues/config/priority";

// RN-svg port of packages/views/issues/components/priority-icon.tsx.
// 4 vertical bars whose count equals priority level; "none" is a single dash.
// v1 skips the urgent-pulse animation.

const PRIORITY_COLOR: Record<IssuePriority, string> = {
  urgent: "hsl(0 84% 60%)",
  high: "hsl(45 80% 55%)",
  medium: "hsl(45 80% 55%)",
  low: "hsl(220 60% 50%)",
  none: "hsl(240 4% 46%)",
};

interface Props {
  priority: IssuePriority;
  size?: number;
  color?: string;
}

export function PriorityIcon({ priority, size = 14, color }: Props) {
  const cfg = PRIORITY_CONFIG[priority];
  const c = color ?? PRIORITY_COLOR[priority];

  if (cfg.bars === 0) {
    return (
      <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <Line
          x1={3}
          y1={8}
          x2={13}
          y2={8}
          stroke={c}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill={c}>
      {[0, 1, 2, 3].map((i) => {
        const filled = i < cfg.bars;
        const h = (i + 1) * 3;
        const y = 12 - h;
        return (
          <Rect
            key={i}
            x={1 + i * 4}
            y={y}
            width={3}
            height={h}
            rx={0.5}
            opacity={filled ? 1 : 0.2}
          />
        );
      })}
    </Svg>
  );
}

export { PRIORITY_COLOR };
