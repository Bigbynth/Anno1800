
const goodIcons: Record<string, string> = {
  grain: "🌾",
  wool: "🐑",
  bread: "🍞",
  clothing: "🧥",
  coal: "⚫",
  brick: "🧱",
  beer: "🍺",
  steel: "⚙️",
  windows: "🪟",
  sewing_machine: "🪡",
  bicycle: "🚲",
  gramophone: "🎵",
  sugar_cane: "🌿",
  tobacco: "🍃",
  cotton: "☁️",
  coffee: "☕",
  rubber: "🌳",
  cocoa: "🍫",
};

export function getResourceIcon(good: string): string {
  return goodIcons[good] ?? "📦";
}
