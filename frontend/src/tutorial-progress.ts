
/* STEP 105 — TUTORIAL COMPLETION PERSISTENCE */

export type TutorialStatus =
  | "new"
  | "dismissed"
  | "completed";

const STORAGE_KEY = "anno1800.tutorial-status.v1";

export function loadTutorialStatus(): TutorialStatus {
  try {
    const value = window.localStorage.getItem(
      STORAGE_KEY
    );

    if (
      value === "new" ||
      value === "dismissed" ||
      value === "completed"
    ) {
      return value;
    }

    return "new";
  } catch {
    return "new";
  }
}

export function saveTutorialStatus(
  status: TutorialStatus
): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      status
    );
  } catch (error) {
    console.warn(
      "Unable to save tutorial status:",
      error
    );
  }
}
