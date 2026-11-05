
import type { IndustryCatalogueSnapshot } from "../types";
import { pretty } from "../types";

type Industry = IndustryCatalogueSnapshot["industries"][number];

type Props = {
  industries: Industry[];
  selectedIndustryId: string | null;
  disabled?: boolean;
  onSelect: (industryId: string) => void;
  onClose: () => void;
};

export function ConstructionPalette({
  industries,
  selectedIndustryId,
  disabled = false,
  onSelect,
  onClose,
}: Props) {
  return (
    <section className="construction-palette">
      <header className="construction-palette-header">
        <div>
          <span className="construction-palette-eyebrow">
            INDUSTRIAL DEVELOPMENT
          </span>
          <h2>Choose an Industry</h2>
        </div>
        <button
          type="button"
          className="construction-palette-close"
          onClick={onClose}
          aria-label="Close construction mode"
        >
          ×
        </button>
      </header>

      <div className="construction-palette-list">
        {industries.map(industry => {
          const unavailable =
            industry.remaining <= 0 || industry.already_owned;
          const selected = selectedIndustryId === industry.id;

          return (
            <button
              key={industry.id}
              type="button"
              className={`construction-industry-tile ${selected ? "is-selected" : ""}`}
              disabled={disabled || unavailable}
              aria-pressed={selected}
              onClick={() => onSelect(industry.id)}
            >
              <span className="construction-industry-emblem">
                ⚙
              </span>
              <span className="construction-industry-content">
                <strong>{industry.name}</strong>
                <small>Produces {pretty(industry.good)}</small>
                <small>Worker: {pretty(industry.worker_type)}</small>
                <span className="construction-industry-cost">
                  {Object.entries(industry.build_cost).length
                    ? Object.entries(industry.build_cost)
                        .map(([good, amount]) =>
                          `${amount} × ${pretty(good)}`
                        )
                        .join(" · ")
                    : "No resource payment"}
                </span>
              </span>
              <span className="construction-industry-count">
                {industry.remaining} left
              </span>
            </button>
          );
        })}
      </div>
      <footer className="construction-palette-footer">
        Select an industry, then choose a space on your island.
      </footer>
    </section>
  );
}
