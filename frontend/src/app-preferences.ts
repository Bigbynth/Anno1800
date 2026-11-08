
/* STEP 101 — APPLICATION PREFERENCES */

export interface AppPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  compactInterface: boolean;
  confirmEndTurn: boolean;
}

const STORAGE_KEY = "anno1800.app-preferences.v1";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  reducedMotion: false,
  highContrast: false,
  compactInterface: false,
  confirmEndTurn: true,
};

function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  );
}

export function loadAppPreferences(): AppPreferences {
  const defaults: AppPreferences = {
    ...DEFAULT_APP_PREFERENCES,
    reducedMotion: systemPrefersReducedMotion(),
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) return defaults;

    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return defaults;
    }

    const data = parsed as Record<string, unknown>;

    return {
      reducedMotion:
        typeof data.reducedMotion === "boolean"
          ? data.reducedMotion
          : defaults.reducedMotion,

      highContrast:
        typeof data.highContrast === "boolean"
          ? data.highContrast
          : defaults.highContrast,

      compactInterface:
        typeof data.compactInterface === "boolean"
          ? data.compactInterface
          : defaults.compactInterface,

      confirmEndTurn:
        typeof data.confirmEndTurn === "boolean"
          ? data.confirmEndTurn
          : defaults.confirmEndTurn,
    };
  } catch {
    return defaults;
  }
}

export function saveAppPreferences(
  preferences: AppPreferences
): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(preferences)
    );
  } catch (error) {
    console.warn(
      "Could not persist application preferences:",
      error
    );
  }
}

export function applyAppPreferences(
  preferences: AppPreferences
): void {
  const root = document.documentElement;

  root.dataset.annoReducedMotion =
    String(preferences.reducedMotion);

  root.dataset.annoHighContrast =
    String(preferences.highContrast);

  root.dataset.annoCompact =
    String(preferences.compactInterface);
}
