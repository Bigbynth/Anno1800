
/* STEP 102 — KEYBOARD SHORTCUT DEFINITIONS */

export type KeyboardShortcutAction =
  | "help"
  | "objectives"
  | "history"
  | "results"
  | "archive"
  | "settings"
  | "main_menu";

export interface KeyboardShortcutDefinition {
  action: KeyboardShortcutAction;
  keys: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS:
  KeyboardShortcutDefinition[] = [
  {
    action: "help",
    keys: "?",
    description: "Show keyboard shortcuts",
  },
  {
    action: "objectives",
    keys: "Shift + O",
    description: "Open Objectives",
  },
  {
    action: "history",
    keys: "Shift + H",
    description: "Open Game History",
  },
  {
    action: "results",
    keys: "Shift + R",
    description: "Open Results",
  },
  {
    action: "archive",
    keys: "Shift + A",
    description: "Open Save / Load",
  },
  {
    action: "settings",
    keys: "Shift + S",
    description: "Open Application Settings",
  },
  {
    action: "main_menu",
    keys: "Shift + M",
    description: "Return to Main Menu",
  },
];


/* Ignore shortcuts while entering text. */
export function isEditableTarget(
  target: EventTarget | null
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        '[contenteditable=""]',
        '[contenteditable="true"]',
        '[role="textbox"]',
      ].join(",")
    )
  );
}


/* Decode supported navigation shortcuts. */
export function getKeyboardShortcut(
  event: KeyboardEvent
): KeyboardShortcutAction | null {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    isEditableTarget(event.target)
  ) {
    return null;
  }

  // Question mark is normally Shift + /.
  if (
    event.key === "?" ||
    (event.shiftKey && event.code === "Slash")
  ) {
    return "help";
  }

  if (!event.shiftKey) {
    return null;
  }

  switch (event.key.toLowerCase()) {
    case "o":
      return "objectives";
    case "h":
      return "history";
    case "r":
      return "results";
    case "a":
      return "archive";
    case "s":
      return "settings";
    case "m":
      return "main_menu";
    default:
      return null;
  }
}
