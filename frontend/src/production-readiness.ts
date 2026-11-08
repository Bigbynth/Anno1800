
/* STEP 111 — PRODUCTION READINESS DIAGNOSTICS */

export type ProductionReadinessStatus =
  | "ready"
  | "not_ready";

export interface ProductionReadinessProducer {
  index: number;
  name: string;
  good: string;
  canProduce: boolean;
}

export interface ProductionReadinessItem {
  index: number;
  name: string;
  good: string;
  status: ProductionReadinessStatus;
  explanation: string;
}

export interface ProductionReadinessSummary {
  total: number;
  ready: number;
  notReady: number;
}

export interface ProductionReadinessResult {
  summary: ProductionReadinessSummary;
  producers: ProductionReadinessItem[];
  selected: ProductionReadinessItem | null;
  actionEnabled: boolean;
  actionExplanation: string;
}

export interface ProductionReadinessInput {
  producers: readonly ProductionReadinessProducer[];
  selectedProducerIndex: number | null;

  actionEnabled: boolean;
  actionExplanation: string;
}

export function analyzeProductionReadiness(
  input: ProductionReadinessInput
): ProductionReadinessResult {
  const producers: ProductionReadinessItem[] =
    input.producers.map(producer => {
      const ready = producer.canProduce;

      return {
        index: producer.index,
        name: producer.name,
        good: producer.good,
        status: ready ? "ready" : "not_ready",
        explanation: ready
          ? "The current game snapshot reports this producer as available."
          : "The current game snapshot reports this producer as unavailable. The exact reason is not included in this readiness flag.",
      };
    });

  const selected =
    input.selectedProducerIndex === null
      ? null
      : producers.find(
          producer =>
            producer.index ===
            input.selectedProducerIndex
        ) ?? null;

  return {
    summary: {
      total: producers.length,
      ready: producers.filter(
        producer => producer.status === "ready"
      ).length,
      notReady: producers.filter(
        producer => producer.status === "not_ready"
      ).length,
    },

    producers,
    selected,

    actionEnabled: input.actionEnabled,
    actionExplanation: input.actionExplanation,
  };
}
