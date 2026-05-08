import Svg, { Circle, G, Line, Path } from "react-native-svg";
import type { IssueStatus } from "@multica/core/types";

// RN-svg port of packages/views/issues/components/status-icon.tsx.
// Same geometry (viewBox 0 0 14 14, center 7,7); RN-svg primitives instead
// of HTML SVG, explicit color prop instead of `currentColor` + Tailwind class.

const CX = 7;
const CY = 7;
const OUTER_R = 6;
const FILL_R = 3.5;

function piePath(progress: number): string {
  const angle = 2 * Math.PI * progress;
  const endX = CX + FILL_R * Math.sin(angle);
  const endY = CY - FILL_R * Math.cos(angle);
  const largeArc = progress > 0.5 ? 1 : 0;
  return `M${CX},${CY} L${CX},${CY - FILL_R} A${FILL_R},${FILL_R} 0 ${largeArc},1 ${endX},${endY} Z`;
}

// Mobile-side hex colors mirroring web's STATUS_CONFIG.iconColor classes
// (text-muted-foreground / text-warning / text-success / text-info / text-destructive).
const STATUS_COLOR: Record<IssueStatus, string> = {
  backlog: "hsl(240 4% 46%)",
  todo: "hsl(240 4% 46%)",
  in_progress: "hsl(45 80% 55%)",
  in_review: "hsl(140 50% 40%)",
  done: "hsl(220 60% 50%)",
  blocked: "hsl(0 84% 60%)",
  cancelled: "hsl(240 4% 46%)",
};

interface Props {
  status: IssueStatus;
  size?: number;
  /** Override the auto-derived color (e.g. inherit from a chip's foreground). */
  color?: string;
}

export function StatusIcon({ status, size = 14, color }: Props) {
  const c = color ?? STATUS_COLOR[status];

  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      {renderStatus(status, c)}
    </Svg>
  );
}

function renderStatus(status: IssueStatus, c: string) {
  switch (status) {
    case "backlog":
      return <BacklogIcon color={c} />;
    case "todo":
      return <ProgressCircle progress={0} color={c} />;
    case "in_progress":
      return <ProgressCircle progress={0.5} color={c} />;
    case "in_review":
      return <ProgressCircle progress={0.75} color={c} />;
    case "done":
      return (
        <ProgressCircle progress={1} color={c}>
          <Path
            d="M10.951 4.249C11.283 4.581 11.283 5.119 10.951 5.451L5.951 10.451C5.619 10.783 5.081 10.783 4.749 10.451L2.749 8.451C2.417 8.119 2.417 7.581 2.749 7.249C3.081 6.917 3.619 6.917 3.951 7.249L5.35 8.648L9.749 4.249C10.081 3.917 10.619 3.917 10.951 4.249Z"
            fill="white"
          />
        </ProgressCircle>
      );
    case "blocked":
      return (
        <ProgressCircle progress={0} color={c}>
          <Line
            x1={CX + FILL_R * Math.cos(Math.PI * 0.75)}
            y1={CY - FILL_R * Math.sin(Math.PI * 0.75)}
            x2={CX + FILL_R * Math.cos(-Math.PI * 0.25)}
            y2={CY - FILL_R * Math.sin(-Math.PI * 0.25)}
            stroke={c}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </ProgressCircle>
      );
    case "cancelled":
      return (
        <ProgressCircle progress={0} color={c}>
          <Path
            d="M5 5 L9 9 M9 5 L5 9"
            stroke={c}
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </ProgressCircle>
      );
  }
}

function ProgressCircle({
  progress,
  color,
  children,
}: {
  progress: number;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <G>
      <Circle
        cx={CX}
        cy={CY}
        r={OUTER_R}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="3.14 0"
        strokeDashoffset={-0.7}
      />
      {progress === 1 && (
        <Circle cx={CX} cy={CY} r={OUTER_R} fill={color} />
      )}
      {progress > 0 && progress < 1 && (
        <Path d={piePath(progress)} fill={color} />
      )}
      {children}
    </G>
  );
}

function BacklogIcon({ color }: { color: string }) {
  const count = 16;
  const dotR = 0.55;
  return (
    <G>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        return (
          <Circle
            key={i}
            cx={CX + OUTER_R * Math.cos(angle)}
            cy={CY + OUTER_R * Math.sin(angle)}
            r={dotR}
            fill={color}
          />
        );
      })}
    </G>
  );
}

export { STATUS_COLOR };
