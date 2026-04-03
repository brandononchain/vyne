"use client";

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

/**
 * Custom edge component that replaces React Flow's default "spaghetti wire"
 * with a clean, branded connection line.
 *
 * Features:
 * - Smooth step path (right angles, rounded corners — not messy bezier)
 * - Animated gradient flow dots
 * - Centered label showing data direction
 * - Subtle glow on hover
 */
function VyneEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  animated,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      {/* Glow layer (visible on hover/select) */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: "var(--vyne-accent)",
          strokeWidth: selected ? 6 : 0,
          strokeOpacity: 0.12,
          filter: "blur(4px)",
          transition: "stroke-width 0.2s ease",
          ...style,
        }}
      />

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected
            ? "var(--vyne-accent)"
            : "var(--vyne-border-hover)",
          strokeWidth: selected ? 2.5 : 2,
          transition: "stroke 0.2s ease, stroke-width 0.2s ease",
          ...style,
        }}
      />

      {/* Animated flow dots along the path */}
      {animated && (
        <circle r="3" fill="var(--vyne-accent)" opacity="0.6">
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Direction label at midpoint */}
      <EdgeLabelRenderer>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className={`
            flex items-center justify-center w-6 h-6 rounded-full
            border border-[var(--vyne-border)] bg-white
            shadow-[var(--shadow-sm)] transition-all duration-150
            ${selected ? "border-[var(--vyne-accent)] shadow-[var(--shadow-glow)]" : ""}
            hover:scale-110
          `}
        >
          {selected ? (
            <Zap size={10} className="text-[var(--vyne-accent)]" />
          ) : (
            <ArrowRight size={10} className="text-[var(--vyne-text-tertiary)]" />
          )}
        </motion.div>
      </EdgeLabelRenderer>
    </>
  );
}

export const VyneEdge = memo(VyneEdgeComponent);
