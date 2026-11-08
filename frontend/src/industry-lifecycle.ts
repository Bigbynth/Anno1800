
/* STEP 116 — INDUSTRY LIFECYCLE */

import type {
  IndustrySnapshot,
} from "./types";

export type IndustryLifecycleStatus =
  | "ready"
  | "occupied"
  | "unavailable";

export interface IndustryLifecycleItem {
  index: number;
  name: string;
  good: string;
  workerType: string;
  occupied: boolean;
  canProduce: boolean;
  status: IndustryLifecycleStatus;
  explanation: string;
}

export interface IndustryLifecycleSummary {
  total: number;
  ready: number;
  occupied: number;
  unavailable: number;
}

export interface IndustryLifecycleResult {
  industries: IndustryLifecycleItem[];
  summary: IndustryLifecycleSummary;
  selected: IndustryLifecycleItem | null;
}

export function analyzeIndustryLifecycle(
  industries: readonly IndustrySnapshot[],
  selectedIndustryIndex: number | null
): IndustryLifecycleResult {
  const items: IndustryLifecycleItem[] =
    industries.map(industry => {
      let status: IndustryLifecycleStatus;
      let explanation: string;

      if (industry.occupied) {
        status = "occupied";

        explanation =
          "A worker is already assigned to this " +
          "industry's workplace. A Festival can " +
          "refresh the population and release " +
          "assigned workers.";
      } else if (industry.can_produce) {
        status = "ready";

        explanation =
          "The workplace is empty and the engine " +
          "reports that a suitable worker is " +
          "available for production.";
      } else {
        status = "unavailable";

        explanation =
          "The workplace is empty, but the engine " +
          "does not currently permit production. " +
          "Check workforce availability.";
      }

      return {
        index: industry.index,
        name: industry.name,
        good: industry.good,
        workerType: industry.worker_type,
        occupied: industry.occupied,
        canProduce: industry.can_produce,
        status,
        explanation,
      };
    });

  return {
    industries: items,

    summary: {
      total: items.length,

      ready: items.filter(
        item => item.status === "ready"
      ).length,

      occupied: items.filter(
        item => item.status === "occupied"
      ).length,

      unavailable: items.filter(
        item => item.status === "unavailable"
      ).length,
    },

    selected:
      selectedIndustryIndex === null
        ? null
        : items.find(
            item =>
              item.index === selectedIndustryIndex
          ) ?? null,
  };
}
