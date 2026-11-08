
import { useMemo, useState } from "react";
import type {
  GameSnapshot,
  NavalCatalogueSnapshot,
} from "../types";

import {
  validateConstructionPayments,
} from "../payment-validation";

import type { ConstructionPayment } from "../api";

import {
  ResourcePaymentPicker,
  hasDuplicateProductionSources,
  toConstructionPayments,
} from "./ResourcePaymentPicker";

type NavalType = "shipyard" | "ship";

type Props = {
  game: GameSnapshot;
  navalData: NavalCatalogueSnapshot;
  selectedSpaceId: string | null;
  actionLoading: boolean;
  onTypeChange: (type: NavalType) => void;
  onClose: () => void;
  onBuild: (
    type: NavalType,
    constructionId: string,
    spaceId: string,
    payments: ConstructionPayment[],
    shipyardIndex?: number
  ) => Promise<void>;
};

export function NavalConstructionPanel({
  game,
  navalData,
  selectedSpaceId,
  actionLoading,
  onTypeChange,
  onClose,
  onBuild,
}: Props) {
  const [type, setType] = useState<NavalType>("shipyard");
  const [constructionId, setConstructionId] = useState("");
  const [shipyardIndex, setShipyardIndex] = useState("");
  const [paymentSources, setPaymentSources] =
    useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogue =
    type === "shipyard"
      ? navalData.shipyards
      : navalData.ships;

  const construction = catalogue.find(
    item => item.id === constructionId
  );

  const requirements = useMemo(
    () =>
      Object.entries(construction?.build_cost ?? {}).flatMap(
        ([good, amount]) =>
          Array.from({ length: amount }, (_, index) => ({
            key: `${good}:${index}`,
            good,
          }))
      ),
    [construction]
  );

  const assigned = requirements.every(
    item => Boolean(paymentSources[item.key])
  );

  const duplicateProduction =
    hasDuplicateProductionSources(
      paymentSources,
      requirements
    );

  /* STEP 114.9.3 — NAVAL PAYMENT PREFLIGHT */

  const navalPaymentValidation =
    validateConstructionPayments({
      requirements,
      paymentSources,
      players: game.players,
      currentPlayerIndex: game.current_player_index,
      tradeCapacity:
        navalData.naval_capacity.trade,
    });

  const selectedShipyard =
    navalData.owned_shipyards.find(
      item => String(item.index) === shipyardIndex
    );

  const shipyardValid =
    type === "shipyard" ||
    (
      Boolean(selectedShipyard) &&
      (selectedShipyard?.strength ?? 0) >=
        (construction?.strength ?? 0)
    );

  const spaceValid = navalData.spaces.some(
    space =>
      space.id === selectedSpaceId &&
      !space.occupied &&
      space.type === (
        type === "shipyard" ? "coast" : "sea"
      )
  );

  const canBuild =
    Boolean(construction) &&
    (construction?.remaining ?? 0) > 0 &&
    Boolean(selectedSpaceId) &&
    spaceValid &&
    shipyardValid &&
    assigned &&
    !duplicateProduction &&
    navalPaymentValidation.canSubmit &&
    !actionLoading &&
    !submitting &&
    !game.game_over &&
    !game.main_action_used;

    function changeType(next: NavalType) {
    setType(next);
    onTypeChange(next);
    setConstructionId("");
    setShipyardIndex("");
    setPaymentSources({});
    setError(null);
    }

  function chooseConstruction(id: string) {
    setConstructionId(id);
    setShipyardIndex("");
    setPaymentSources({});
    setError(null);
  }

  async function confirmBuild() {
    if (
      !canBuild ||
      !construction ||
      !selectedSpaceId
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payments = toConstructionPayments(
        requirements,
        paymentSources
      );

      await onBuild(
        type,
        construction.id,
        selectedSpaceId,
        payments,
        type === "ship"
          ? Number(shipyardIndex)
          : undefined
      );

      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Naval construction failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="naval-construction-panel"
      aria-label="Naval construction"
    >
      <header className="naval-construction-header">
        <div>
          <span className="construction-palette-eyebrow">
            MARITIME DEVELOPMENT
          </span>
          <h2>Naval Construction</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close naval construction"
        >
          ×
        </button>
      </header>

      <div className="naval-construction-tabs">
        <button
          type="button"
          className={type === "shipyard" ? "is-selected" : ""}
          onClick={() => changeType("shipyard")}
          disabled={submitting}
        >
          Shipyards
        </button>

        <button
          type="button"
          className={type === "ship" ? "is-selected" : ""}
          onClick={() => changeType("ship")}
          disabled={submitting}
        >
          Ships
        </button>
      </div>

      <div className="naval-construction-list">
        {catalogue.map(item => (
          <button
            key={item.id}
            type="button"
            className={[
              "naval-construction-item",
              constructionId === item.id
                ? "is-selected"
                : "",
            ].join(" ")}
            disabled={
              submitting ||
              actionLoading ||
              item.remaining <= 0
            }
            onClick={() => chooseConstruction(item.id)}
          >
            <strong>{item.name}</strong>
            <small>
              Strength {item.strength}
              {" · "}
              {item.remaining} remaining
            </small>
          </button>
        ))}
      </div>

      {construction && (
        <div className="naval-construction-details">
          <h3>{construction.name}</h3>
          {/* STEP 114.9.4 — NAVAL SUPPLY CHECK */}
          {construction.remaining <= 0 && (
            <p
              className="naval-construction-error"
              role="status"
            >
              This naval construction is no longer
              available. No pieces remain in the
              current catalogue.
            </p>
          )}
          <p>
            Select an unoccupied{" "}
            <strong>
              {type === "shipyard" ? "coast" : "sea"}
            </strong>{" "}
            space on the island board.
          </p>

          <p>
            Selected space:{" "}
            <strong>{selectedSpaceId ?? "None"}</strong>
          </p>

          {selectedSpaceId && !spaceValid && (
            <p className="naval-construction-error">
              This location is not a valid candidate
              for the selected construction type.
            </p>
          )}

          {type === "ship" && (
            <label className="naval-shipyard-select">
              <span>Construct at shipyard</span>

              <select
                value={shipyardIndex}
                onChange={event =>
                  setShipyardIndex(event.target.value)
                }
                disabled={submitting}
              >
                <option value="">Select shipyard</option>

                {navalData.owned_shipyards.map(shipyard => (
                  <option
                    key={shipyard.index}
                    value={shipyard.index}
                    disabled={
                      (construction.strength ?? 0) >
                      shipyard.strength
                    }
                  >
                    {shipyard.name} — Strength {shipyard.strength}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ResourcePaymentPicker
            game={game}
            requirements={requirements}
            paymentSources={paymentSources}
            onChange={next => {
              setPaymentSources(next);
              setError(null);
            }}
            disabled={actionLoading || submitting}
          />

          {duplicateProduction && (
            <p className="naval-construction-error">
              The same local producer cannot be
              assigned to multiple payments.
            </p>
          )}

          {/* STEP 114.9.3 — PAYMENT ISSUES */}
          {navalPaymentValidation.errors.length > 0 && (
            <div
              className="naval-construction-error"
              role="status"
            >
              <strong>Payment issues</strong>

              {navalPaymentValidation.errors.map(
                (message, index) => (
                  <p key={index}>{message}</p>
                )
              )}
            </div>
          )}

          {/* STEP 114.9.3 — SHIPPING ADVISORIES */}
          {navalPaymentValidation.warnings.length > 0 && (
            <div className="naval-construction-note">
              <strong>Shipping advisory</strong>

              {navalPaymentValidation.warnings.map(
                (message, index) => (
                  <p key={index}>{message}</p>
                )
              )}
            </div>
          )}

          {error && (
            <p
              className="naval-construction-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            className="naval-construction-confirm"
            disabled={!canBuild}
            onClick={() => void confirmBuild()}
          >
            {submitting
              ? "Constructing..."
              : `Build ${construction.name}`}
          </button>
        </div>
      )}

      <p className="naval-construction-note">
        The Python engine validates costs, placement,
        shipyard strength and action availability
        before applying construction.
      </p>
    </section>
  );
}
