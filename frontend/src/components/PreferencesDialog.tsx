
import type { AppPreferences } from "../app-preferences";

import {
  DEFAULT_APP_PREFERENCES,
} from "../app-preferences";

type Props = {
  preferences: AppPreferences;
  onChange: (preferences: AppPreferences) => void;
  onClose: () => void;
};

type PreferenceKey = keyof AppPreferences;

type SettingDefinition = {
  key: PreferenceKey;
  title: string;
  description: string;
};

const ACCESSIBILITY_SETTINGS: SettingDefinition[] = [
  {
    key: "reducedMotion",
    title: "Reduced Motion",
    description:
      "Reduce transitions and decorative animations.",
  },
  {
    key: "highContrast",
    title: "High Contrast",
    description:
      "Strengthen text, borders, and focus indicators.",
  },
  {
    key: "compactInterface",
    title: "Compact Interface",
    description:
      "Use tighter spacing in selected menus and panels.",
  },
];

const GAMEPLAY_SETTINGS: SettingDefinition[] = [
  {
    key: "confirmEndTurn",
    title: "Confirm End Turn",
    description:
      "Ask for confirmation before ending a company turn.",
  },
];

export function PreferencesDialog({
  preferences,
  onChange,
  onClose,
}: Props) {
  function updateSetting(
    key: PreferenceKey,
    value: boolean
  ) {
    onChange({
      ...preferences,
      [key]: value,
    });
  }

  function renderSetting(setting: SettingDefinition) {
    return (
      <label
        className="preferences-setting"
        key={setting.key}
      >
        <span className="preferences-setting-info">
          <strong>{setting.title}</strong>
          <small>{setting.description}</small>
        </span>

        <input
          type="checkbox"
          checked={preferences[setting.key]}
          onChange={event =>
            updateSetting(
              setting.key,
              event.target.checked
            )
          }
        />
      </label>
    );
  }

  return (
    <div
      className="preferences-backdrop"
      onClick={onClose}
    >
      <section
        className="preferences-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="preferences-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE CAPTAIN'S QUARTERS
            </span>

            <h2 id="preferences-title">
              Application Settings
            </h2>

            <p>
              Customize the interface and gameplay
              confirmations.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="preferences-content">
          <section className="preferences-section">
            <h3>Appearance & Accessibility</h3>

            {ACCESSIBILITY_SETTINGS.map(renderSetting)}
          </section>

          <section className="preferences-section">
            <h3>Gameplay Preferences</h3>

            {GAMEPLAY_SETTINGS.map(renderSetting)}
          </section>

          {!preferences.confirmEndTurn && (
            <p
              className="preferences-warning"
              role="status"
            >
              End Turn will be submitted immediately
              without displaying its confirmation
              dialog. The engine will still validate
              the action.
            </p>
          )}
        </div>

        <footer className="preferences-footer">
          <button
            type="button"
            className="preferences-reset"
            onClick={() =>
              onChange({
                ...DEFAULT_APP_PREFERENCES,
              })
            }
          >
            Restore Defaults
          </button>

          <button
            type="button"
            className="preferences-done"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
