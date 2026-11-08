
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  GAME_TUTORIAL_STEPS,
  TUTORIAL_MILESTONES,
} from "../game-tutorial";

import type {
  TutorialInteractionEvent,
} from "../game-tutorial";

type Props = {
  onClose: () => void;
  onComplete: () => void;

  interactionEvent: TutorialInteractionEvent | null;

  mainActionUsed: boolean;
  gameOver: boolean;
};

type CompletedMilestones =
  Record<string, boolean>;

export function GameTutorial({
  onClose,
  onComplete,
  interactionEvent,
  mainActionUsed,
  gameOver,
}: Props) {
  const [stepIndex, setStepIndex] =
    useState(0);

  const [completed, setCompleted] =
    useState<CompletedMilestones>({});

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  const nextButtonRef =
    useRef<HTMLButtonElement>(null);

  const lastEventRef =
    useRef<number>(interactionEvent?.sequence ?? 0);

  const currentStep =
    GAME_TUTORIAL_STEPS[stepIndex];

  const currentMilestones =
    TUTORIAL_MILESTONES[currentStep.id];

  const totalSteps =
    GAME_TUTORIAL_STEPS.length;

  const completedForStep =
    currentMilestones.filter(
      milestone => completed[milestone.id]
    ).length;

  const stepFinished =
    completedForStep === currentMilestones.length;

  const progress =
    ((stepIndex + 1) / totalSteps) * 100;

  const actionUnavailable =
    mainActionUsed || gameOver;

  /* STEP 105 — FOCUS RESTORATION */
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

      const previous =
        previousFocusRef.current;

      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, []);

  /* Focus the navigation button when lessons change. */
  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [stepIndex]);

  /* Highlight the active tutorial target. */
  useEffect(() => {
    const target =
      document.querySelector<HTMLElement>(
        `[data-tutorial="${currentStep.target}"]`
      );

    if (!target) return;

    target.classList.add("tutorial-highlight");

    return () => {
      target.classList.remove(
        "tutorial-highlight"
      );
    };
  }, [currentStep.target]);

  /* STEP 106 — OBSERVE REAL UI INTERACTIONS */
  useEffect(() => {
    if (!interactionEvent) return;

    if (
      interactionEvent.sequence <= lastEventRef.current
    ) {
      return;
    }

    lastEventRef.current = interactionEvent.sequence;

    const matchingMilestone =
      currentMilestones.find(
        milestone =>
          milestone.interaction === interactionEvent.id
      );

    if (!matchingMilestone) return;

    setCompleted(previous => ({
      ...previous,
      [matchingMilestone.id]: true,
    }));
  }, [
    interactionEvent,
    currentMilestones,
  ]);

  /* Escape closes tutorial unless another modal is open. */
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

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

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [onClose]);

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
    setCompleted({});
    lastEventRef.current =
      interactionEvent?.sequence ?? 0;
  }

  function markCurrentMilestone() {
    const milestone =
      currentMilestones.find(
        item => item.interaction === null
      );

    if (!milestone) return;

    setCompleted(previous => ({
      ...previous,
      [milestone.id]: true,
    }));
  }

  const contextualHint = (() => {
    if (
      actionUnavailable &&
      (
        currentStep.id === "construction" ||
        currentStep.id === "production" ||
        currentStep.id === "naval"
      )
    ) {
      return gameOver
        ? "The game has ended, so this gameplay action is unavailable. You can still review the lesson."
        : "Your main action has already been used. This gameplay action may be unavailable until a later turn.";
    }

    if (currentStep.id === "island") {
      return "Select an island space to inspect it. The tutorial will recognize the selection.";
    }

    if (currentStep.id === "construction") {
      return "Choose Build in the Action Dock. Opening the Construction Palette completes this milestone.";
    }

    if (currentStep.id === "production") {
      return "Choose Produce when available. Opening the panel is enough; you do not need to spend your action.";
    }

    if (currentStep.id === "population") {
      return "Expand the Population Cards section below the board to complete the milestone.";
    }

    if (currentStep.id === "naval") {
      return "Choose Naval in the Action Dock to inspect shipyard and ship construction.";
    }

    return "Review the Turn Status panel, then select Mark as Reviewed. You do not need to end your turn.";
  })();

  return (
    <div className="game-tutorial-layer">
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
            aria-label="Tutorial lesson progress"
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

        {/* STEP 106 — OBSERVED MILESTONES */}
        <section
          className="game-tutorial-milestones"
          aria-label="Lesson milestones"
        >
          <div className="game-tutorial-milestone-heading">
            <strong>Lesson Milestones</strong>
            <span>
              {completedForStep}/{currentMilestones.length}
            </span>
          </div>

          {currentMilestones.map(milestone => (
            <div
              key={milestone.id}
              className={[
                "game-tutorial-milestone",
                completed[milestone.id]
                  ? "is-complete"
                  : "",
              ].join(" ")}
            >
              <span aria-hidden="true">
                {completed[milestone.id]
                  ? "✓"
                  : "○"}
              </span>

              <div>
                <strong>{milestone.label}</strong>

                <small>
                  {completed[milestone.id]
                    ? "Observed"
                    : "Waiting for interaction"}
                </small>
              </div>
            </div>
          ))}

          {currentStep.id === "turn" &&
            !stepFinished && (
              <button
                type="button"
                className="game-tutorial-mark-reviewed"
                onClick={markCurrentMilestone}
              >
                Mark as Reviewed
              </button>
            )}
        </section>

        <div className="game-tutorial-guidance">
          <strong>CONTEXTUAL GUIDANCE</strong>

          <p>{contextualHint}</p>
        </div>

        {!stepFinished && (
          <p className="game-tutorial-note">
            You can continue without completing this
            milestone. The tutorial will never perform
            a game action automatically.
          </p>
        )}

        {stepFinished && (
          <p
            className="game-tutorial-success"
            role="status"
          >
            Milestone completed. Continue when ready.
          </p>
        )}

        <footer className="game-tutorial-actions">
          <button
            type="button"
            className="game-tutorial-skip"
            onClick={onClose}
          >
            Skip
          </button>

          <button
            type="button"
            className="game-tutorial-restart"
            onClick={restartTutorial}
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
