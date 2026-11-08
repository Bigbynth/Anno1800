
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  GAME_TUTORIAL_STEPS,
} from "../game-tutorial";

type Props = {
  onClose: () => void;
  onComplete: () => void;
};

export function GameTutorial({
  onClose,
  onComplete,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  const nextButtonRef =
    useRef<HTMLButtonElement>(null);

  const currentStep =
    GAME_TUTORIAL_STEPS[stepIndex];

  const totalSteps =
    GAME_TUTORIAL_STEPS.length;

  const progress =
    ((stepIndex + 1) / totalSteps) * 100;

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    nextButtonRef.current?.focus();
    return () => {
      document.querySelectorAll(
        ".tutorial-highlight"
      ).forEach(element => {
        element.classList.remove(
          "tutorial-highlight"
        );
      });

      const previous = previousFocusRef.current;

      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, []);

  useEffect(() => {
    const target = document.querySelector(
      `[data-tutorial="${currentStep.target}"]`
    );

    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.classList.add("tutorial-highlight");

    // Do not scroll automatically: IslandCanvas may have
    // its own zoom and pan behavior. Avoid changing it.
    return () => {
      target.classList.remove("tutorial-highlight");
    };
  }, [currentStep.target]);

    /* STEP 105 — KEEP TUTORIAL KEYBOARD FOCUS */
    useEffect(() => {
    nextButtonRef.current?.focus();
    }, [stepIndex]);

  function nextStep() {
    if (stepIndex >= totalSteps - 1) {
      onComplete();
      return;
    }

    setStepIndex(index => index + 1);
  }

  function previousStep() {
    setStepIndex(index =>
      Math.max(0, index - 1)
    );
  }

  function restartTutorial() {
    setStepIndex(0);
  }
  
    /* STEP 105 — CLOSE TUTORIAL FROM KEYBOARD */
    useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
        if (event.key !== "Escape") return;

        // Do not interfere with another open modal.
        if (
        document.querySelector(
            '[role="dialog"][aria-modal="true"]'
        )
        ) {
        return;
        }

        event.preventDefault();
        onClose();
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
        window.removeEventListener(
        "keydown",
        handleEscape
        );
    };
    }, [onClose]);


  return (
    <div
      className="game-tutorial-layer"
    >
      <section
        className="game-tutorial-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="game-tutorial-title"
      >
        <header className="game-tutorial-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE INDUSTRIAL ACADEMY
            </span>

            <h2 id="game-tutorial-title">
              Your First Company Turn
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close tutorial"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="game-tutorial-progress">
          <div className="game-tutorial-progress-label">
            <span>
              Lesson {stepIndex + 1} of {totalSteps}
            </span>

            <strong>
              {Math.round(progress)}%
            </strong>
          </div>

          <div
            className="game-tutorial-progress-track"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-label="Tutorial progress"
          >
            <div
              className="game-tutorial-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div
        className="game-tutorial-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        >
        Lesson {stepIndex + 1} of {totalSteps}:
        {" "}{currentStep.title}
        </div>

        <article className="game-tutorial-lesson">
          <span>{currentStep.subtitle}</span>

          <h3>{currentStep.title}</h3>

          <p>{currentStep.description}</p>

          <ul>
            {currentStep.instructions.map(
              (instruction, index) => (
                <li key={index}>
                  {instruction}
                </li>
              )
            )}
          </ul>
        </article>

        <p className="game-tutorial-note">
          This lesson does not execute a game action.
          Use the highlighted control to explore the
          interface, or move to the next lesson.
        </p>

        <footer className="game-tutorial-actions">
          <button
            type="button"
            onClick={onClose}
            className="game-tutorial-skip"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={restartTutorial}
            className="game-tutorial-restart"
          >
            Restart
          </button>

          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={previousStep}
          >
            Previous
          </button>

          <button
            ref={nextButtonRef}
            type="button"
            className="game-tutorial-next"
            onClick={nextStep}
          >
            {currentStep.actionLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
