import { useMemo } from "react";
import type { Edge } from "@/lib/settlement";

type Props = {
  people: string[];
  edges: Edge[];
};

export function edgeKey(e: Edge) {
  return `${e.from}->${e.to}:${e.amount}`;
}

export function DebtGraph({ people, edges }: Props) {
  const n = people.length;
  // Auto-scale canvas + node sizes based on count
  const size = Math.max(480, Math.min(1200, 360 + n * 28));
  const cx = size / 2;
  const cy = size / 2;
  const nodeR = n <= 6 ? 26 : n <= 12 ? 22 : n <= 20 ? 18 : 14;
  const fontSize = n <= 6 ? 14 : n <= 12 ? 12 : n <= 20 ? 11 : 10;
  const labelFont = n <= 12 ? 11 : 10;
  const radius = size / 2 - (nodeR + 36);

  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    const count = people.length || 1;
    people.forEach((p, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      map[p] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
    return map;
  }, [people, cx, cy, radius]);

  if (people.length === 0) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Add people to see the graph
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full rounded-lg border border-border bg-card"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary)" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = positions[e.from];
        const b = positions[e.to];
        if (!a || !b) return null;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const pad = nodeR + 2;
        const x1 = a.x + ux * pad;
        const y1 = a.y + uy * pad;
        const x2 = b.x - ux * pad;
        const y2 = b.y - uy * pad;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const labelW = 40;
        const labelH = 18;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#arrow)" opacity={0.7} />
            <rect x={mx - labelW / 2} y={my - labelH / 2} width={labelW} height={labelH} rx="4" fill="var(--color-background)" stroke="var(--color-border)" />
            <text x={mx} y={my + 4} textAnchor="middle" fontSize={labelFont} fill="var(--color-foreground)" fontWeight="600">
              ₹{e.amount}
            </text>
          </g>
        );
      })}
      {people.map(p => {
        const pos = positions[p];
        const display = p.length > 6 ? p.slice(0, 5) + "…" : p;
        return (
          <g key={p}>
            <circle cx={pos.x} cy={pos.y} r={nodeR} fill="var(--color-primary)" />
            <text x={pos.x} y={pos.y + fontSize / 3} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill="var(--color-primary-foreground)">
              {display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
