from dataclasses import dataclass

@dataclass
class TurnState:
    main_action_used: bool = False

    def consume_main_action(self) -> None:
        if self.main_action_used:
            raise RuntimeError("Main action has already been used")

        self.main_action_used = True

    def reset(self) -> None:
        self.main_action_used = False