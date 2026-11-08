
import type {
  NavalReadinessResult,
} from "../naval-readiness";

type Props = {
  readiness: NavalReadinessResult;
};

export function NavalReadinessPanel({
  readiness,
}: Props) {
  const {
    constructionType,
    selectedSpace,
    candidateSpaces,
    ownedShipyards,
    ownedShipCount,
    availableShipyardDefinitions,
    availableShipDefinitions,
    actionEnabled,
    actionExplanation,
    warnings,
  } = readiness;

  const isShipyard =
    constructionType === "shipyard";

  return (
    <section
      className="naval-readiness-panel"
      aria-label="Naval readiness inspector"
    >
      <header className="naval-readiness-header">
        <span className="construction-palette-eyebrow">
          THE ADMIRALTY OFFICE
        </span>

        <h3>Naval Operations Inspector</h3>

        <p>
          {isShipyard
            ? "Shipyard construction requires an unoccupied coastal space."
            : "Ship construction requires an unoccupied sea space and a suitable owned shipyard."}
        </p>
      </header>

      <div className="naval-readiness-stats">
        <div>
          <strong>{candidateSpaces}</strong>
          <span>Valid spaces</span>
        </div>

        <div>
          <strong>{ownedShipyards.length}</strong>
          <span>Owned shipyards</span>
        </div>

        <div>
          <strong>{ownedShipCount}</strong>
          <span>Owned ships</span>
        </div>
      </div>

      <div className="naval-readiness-section">
        <strong>Construction Supply</strong>

        <p>
          Available{" "}
          {isShipyard
            ? "shipyard"
            : "ship"}{" "}
          definitions:{" "}
          <strong>
            {isShipyard
              ? availableShipyardDefinitions
              : availableShipDefinitions}
          </strong>
        </p>
      </div>

      <div className="naval-readiness-section">
        <strong>Selected Location</strong>

        {!selectedSpace ? (
          <p>
            Select a highlighted space on the island.
          </p>
        ) : (
          <>
            <p>
              <strong>{selectedSpace.id}</strong>
              {" · "}
              {selectedSpace.type}
            </p>

            <p>{selectedSpace.reason}</p>

            <span
              className={
                selectedSpace.selectable
                  ? "naval-readiness-positive"
                  : "naval-readiness-negative"
              }
            >
              {selectedSpace.selectable
                ? "Placement candidate"
                : "Location unavailable"}
            </span>
          </>
        )}
      </div>

      {!isShipyard && (
        <div className="naval-readiness-section">
          <strong>Owned Shipyards</strong>

          {ownedShipyards.length === 0 ? (
            <p>No owned shipyards.</p>
          ) : (
            <div className="naval-readiness-shipyards">
              {ownedShipyards.map(shipyard => (
                <div key={shipyard.index}>
                  <span>{shipyard.name}</span>

                  <small>
                    Strength: {shipyard.strength}
                  </small>
                </div>
              ))}
            </div>
          )}

          <p>
            The selected ship must be compatible
            with the selected shipyard's strength.
          </p>
        </div>
      )}

      {!actionEnabled && (
        <div className="naval-readiness-warning">
          <strong>Construction unavailable</strong>
          <p>{actionExplanation}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="naval-readiness-warning">
          <strong>Construction advisories</strong>

          {warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}

      <p className="naval-readiness-disclaimer">
        These diagnostics use the current
        naval catalogue. Construction legality,
        payment processing and shipyard strength
        are validated by the Python engine
        when submitted.
      </p>
    </section>
  );
}
