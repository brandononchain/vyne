"use client";

import { useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { VyneNodeData, AgentNodeData, TaskNodeData } from "@/lib/types";

const MAP_W = 180;
const MAP_H = 120;
const PAD = 14;

/**
 * A custom minimap that renders a scaled-down live view of the canvas
 * with rounded node rectangles, connection lines, and tiny labels.
 */
export function LiveMinimap() {
  const { nodes, edges } = useWorkflowStore();
  const reactFlow = useReactFlow();

  const scaled = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [], show: false };

    // Node dimensions in flow space
    const NODE_W = 260;
    const NODE_H = 140;

    // Compute bounding box of all nodes
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_W;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_H;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Scale to fit minimap with padding
    const innerW = MAP_W - PAD * 2;
    const innerH = MAP_H - PAD * 2;
    const scale = Math.min(innerW / rangeX, innerH / rangeY);

    // Center the content
    const scaledW = rangeX * scale;
    const scaledH = rangeY * scale;
    const offsetX = PAD + (innerW - scaledW) / 2;
    const offsetY = PAD + (innerH - scaledH) / 2;

    const toX = (x: number) => offsetX + (x - minX) * scale;
    const toY = (y: number) => offsetY + (y - minY) * scale;

    const nodeW = NODE_W * scale;
    const nodeH = NODE_H * scale;

    const scaledNodes = nodes.map((n) => {
      const data = n.data as VyneNodeData;
      const isAgent = data.type === "agent";
      const isTool = data.type === "tool";
      return {
        id: n.id,
        x: toX(n.position.x),
        y: toY(n.position.y),
        w: isTool ? nodeW * 0.7 : nodeW,
        h: isTool ? nodeH * 0.6 : nodeH,
        color: (data as AgentNodeData).color || (data as TaskNodeData).color || "#4a7c59",
        type: data.type,
        name: data.name,
      };
    });

    const nodeMap = new Map(scaledNodes.map((n) => [n.id, n]));

    const scaledEdges = edges
      .map((e) => {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) return null;
        return {
          id: e.id,
          x1: src.x + src.w,
          y1: src.y + src.h / 2,
          x2: tgt.x,
          y2: tgt.y + tgt.h / 2,
        };
      })
      .filter(Boolean) as { id: string; x1: number; y1: number; x2: number; y2: number }[];

    return { nodes: scaledNodes, edges: scaledEdges, show: true };
  }, [nodes, edges]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Could implement click-to-pan here
  };

  if (!scaled.show) return null;

  return (
    <div
      className="absolute top-3 right-3 z-30 rounded-[14px] border border-[var(--vyne-border)]
                 bg-white/90 backdrop-blur-sm shadow-[var(--shadow-md)]
                 overflow-hidden transition-opacity hover:opacity-100 opacity-90"
      style={{ width: MAP_W, height: MAP_H }}
    >
      <svg
        width={MAP_W}
        height={MAP_H}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onClick={handleClick}
        className="cursor-default"
      >
        {/* Background */}
        <rect width={MAP_W} height={MAP_H} fill="var(--vyne-bg)" rx={14} />

        {/* Dot grid */}
        {Array.from({ length: 12 }).map((_, ix) =>
          Array.from({ length: 8 }).map((_, iy) => (
            <circle
              key={`dot-${ix}-${iy}`}
              cx={PAD + ix * ((MAP_W - PAD * 2) / 11)}
              cy={PAD + iy * ((MAP_H - PAD * 2) / 7)}
              r={0.4}
              fill="var(--vyne-border)"
            />
          ))
        )}

        {/* Edges */}
        {scaled.edges.map((e) => {
          const midX = (e.x1 + e.x2) / 2;
          return (
            <path
              key={e.id}
              d={`M ${e.x1} ${e.y1} C ${midX} ${e.y1}, ${midX} ${e.y2}, ${e.x2} ${e.y2}`}
              stroke="var(--vyne-border-hover)"
              strokeWidth={1}
              fill="none"
              opacity={0.6}
            />
          );
        })}

        {/* Nodes */}
        {scaled.nodes.map((n) => {
          const r = n.type === "tool" ? 3 : 4;
          return (
            <g key={n.id}>
              {/* Node shadow */}
              <rect
                x={n.x + 0.5}
                y={n.y + 0.5}
                width={n.w}
                height={n.h}
                rx={r}
                fill="rgba(0,0,0,0.04)"
              />
              {/* Node body */}
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={r}
                fill="white"
                stroke={n.color}
                strokeWidth={1.2}
                opacity={0.95}
              />
              {/* Color accent bar at top */}
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={2}
                rx={r}
                fill={n.color}
                opacity={0.7}
              />
              {/* Tiny label */}
              {n.w > 12 && (
                <text
                  x={n.x + n.w / 2}
                  y={n.y + n.h / 2 + 1.5}
                  textAnchor="middle"
                  fontSize={Math.min(5, n.w / 6)}
                  fontWeight={600}
                  fill="var(--vyne-text-secondary)"
                  opacity={0.7}
                >
                  {n.name.length > 10 ? n.name.slice(0, 8) + "…" : n.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
