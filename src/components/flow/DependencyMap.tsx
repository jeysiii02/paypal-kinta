"use client";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useMemo } from "react";
import type { ImpactClassification } from "@/lib/types";
import { impactTone, labelize } from "@/lib/status";

const classificationColor: Record<ImpactClassification, string> = {
  DIRECTLY_AFFECTED: "#a1262f",
  INDIRECTLY_AFFECTED: "#c47a12",
  UNCERTAIN: "#1d4f91",
  UNAFFECTED: "#176b45",
};

type MapCommitment = {
  id: string;
  title: string;
  dependencies?: Array<{
    id: string;
    dependsOnCommitmentId: string | null;
    dependencyType: string;
  }>;
};

type Props = {
  projectName: string;
  commitments: MapCommitment[];
  impacts?: Array<{
    commitmentId: string;
    classification: ImpactClassification;
  }>;
};

export function DependencyMap({ projectName, commitments, impacts = [] }: Props) {
  const impactMap = useMemo(() => {
    const map = new Map<string, ImpactClassification>();
    for (const item of impacts) map.set(item.commitmentId, item.classification);
    return map;
  }, [impacts]);

  const { nodes, edges } = useMemo(() => {
    const projectNode: Node = {
      id: "project",
      position: { x: 320, y: 20 },
      data: { label: projectName },
      style: {
        background: "#0b1f33",
        color: "white",
        borderRadius: 16,
        padding: 12,
        border: "none",
        width: 220,
        fontWeight: 700,
      },
    };

    const commitmentNodes: Node[] = commitments.map((commitment, index) => {
      const classification = impactMap.get(commitment.id);
      const color = classification
        ? classificationColor[classification]
        : "#5b6f82";
      const col = index % 2;
      const row = Math.floor(index / 2);
      return {
        id: commitment.id,
        position: { x: col === 0 ? 80 : 480, y: 160 + row * 140 },
        data: {
          label: `${commitment.title}\n${classification ? labelize(classification) : "No impact yet"}`,
        },
        style: {
          background: "white",
          border: `2px solid ${color}`,
          borderRadius: 16,
          padding: 12,
          width: 240,
          whiteSpace: "pre-wrap",
          fontSize: 12,
          boxShadow: "0 8px 24px rgba(11,31,51,0.06)",
        },
      };
    });

    const dependencyEdges: Edge[] = [];
    for (const commitment of commitments) {
      dependencyEdges.push({
        id: `project-${commitment.id}`,
        source: "project",
        target: commitment.id,
        animated: false,
        style: { stroke: "#b7c5d4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#b7c5d4" },
      });

      for (const dep of commitment.dependencies ?? []) {
        if (!dep.dependsOnCommitmentId) continue;
        dependencyEdges.push({
          id: dep.id,
          source: dep.dependsOnCommitmentId,
          target: commitment.id,
          label: labelize(dep.dependencyType),
          animated: true,
          style: { stroke: "#0f766e" },
          labelStyle: { fill: "#5b6f82", fontSize: 10 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#0f766e" },
        });
      }
    }

    return { nodes: [projectNode, ...commitmentNodes], edges: dependencyEdges };
  }, [commitments, impactMap, projectName]);

  return (
    <div className="h-[560px] overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-sm)]">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background gap={20} color="#d5dee8" />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === "project") return "#0b1f33";
            const classification = impactMap.get(node.id);
            return classification ? classificationColor[classification] : "#94a3b8";
          }}
        />
        <Controls />
      </ReactFlow>
      <div className="flex flex-wrap gap-3 border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--ink-muted)]">
        {(Object.keys(classificationColor) as ImpactClassification[]).map((key) => (
          <span key={key} className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: classificationColor[key] }}
            />
            {labelize(key)}
            <span className="sr-only">{impactTone(key)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
