
import type {
  GameSetupPreview as PreviewData,
} from "../api";

type Props = {
  preview: PreviewData;
};

const CONTENT_OPTIONS = [
  {
    key: "use_custom_population",
    label: "Population Cards",
  },
  {
    key: "use_custom_new_world",
    label: "New World",
  },
  {
    key: "use_custom_expeditions",
    label: "Expeditions",
  },
  {
    key: "use_custom_objectives",
    label: "Objectives",
  },
] as const;

export function GameSetupPreview({
  preview,
}: Props) {
  return (
    <section
      className="game-setup-preview"
      aria-label="Game setup preview"
    >
      <header className="game-setup-preview-heading">
        <div>
          <span>CONFIGURATION CHECK</span>
          <h3>Setup Preview</h3>
        </div>

        <strong className="game-setup-preview-valid">
          {preview.valid
            ? "Validated"
            : "Not validated"}
        </strong>
      </header>

      <div className="game-setup-preview-stats">
        <div>
          <small>Companies</small>
          <strong>{preview.player_count}</strong>
        </div>

        <div>
          <small>Initial Round</small>
          <strong>{preview.initial_round}</strong>
        </div>

        <div>
          <small>Active Objectives</small>
          <strong>
            {preview.active_objective_count ?? "—"}
          </strong>
        </div>
      </div>

      <div className="game-setup-preview-section">
        <h4>Participating Companies</h4>

        {preview.players.map((player, index) => (
          <div
            className="game-setup-preview-player"
            key={`${index}:${player.name}`}
          >
            <span>{index + 1}. {player.name}</span>
            <small>
              {player.starting_hand_count}
              {" "}starting cards
            </small>
          </div>
        ))}
      </div>

      <div className="game-setup-preview-section">
        <h4>Content Configuration</h4>

        {CONTENT_OPTIONS.map(option => {
          const enabled =
            preview.settings[option.key];

          return (
            <div
              className="game-setup-preview-option"
              key={option.key}
            >
              <span>{option.label}</span>

              <strong
                className={
                  enabled ? "is-custom" : "is-default"
                }
              >
                {enabled
                  ? "Custom content"
                  : "Non-custom content"}
              </strong>
            </div>
          );
        })}
      </div>

      {preview.active_objective_count === null && (
        <p className="game-setup-preview-note">
          Active objective count is not available
          in the current game-state serializer.
        </p>
      )}

      {preview.warnings.map((warning, index) => (
        <p
          className="game-setup-preview-note"
          key={index}
        >
          {warning}
        </p>
      ))}
    </section>
  );
}
