
from __future__ import annotations

import hmac
import os
import pickle
import random
import tempfile

from pathlib import Path
from typing import Any

from anno1800.game import Game


SAVE_VERSION = 1
MAX_SAVE_BYTES = 20 * 1024 * 1024

# Three fixed slots only.
VALID_SLOTS = {"slot1", "slot2", "slot3"}

SAVE_DIR = (
    Path(__file__).resolve().parents[3]
    / "saved_games"
)

MAGIC = b"ANNO1800-SAVE-V1\n"


class SaveError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "invalid_checkpoint",
        format_version: int | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.format_version = format_version


def _ensure_directory() -> None:
    SAVE_DIR.mkdir(
        parents=True,
        exist_ok=True,
        mode=0o700,
    )


def _slot_path(slot: str) -> Path:
    if slot not in VALID_SLOTS:
        raise SaveError("Invalid save slot.")
    return SAVE_DIR / f"{slot}.sav"


def _get_key() -> bytes:
    """Persistent signing key, never sent to the frontend."""
    _ensure_directory()
    path = SAVE_DIR / ".save_key"

    if not path.exists():
        try:
            with path.open("xb") as file:
                file.write(os.urandom(32))
            try:
                os.chmod(path, 0o600)
            except OSError:
                pass
        except FileExistsError:
            pass

    key = path.read_bytes()

    if len(key) != 32:
        raise SaveError("Invalid save signing key.")

    return key


def _read_checkpoint(slot: str) -> dict[str, Any]:
    path = _slot_path(slot)

    if not path.exists():
        raise SaveError(
            "Save slot is empty.",
            code="empty",
        )

    if path.stat().st_size > MAX_SAVE_BYTES:
        raise SaveError(
            "Save file exceeds size limit.",
            code="too_large",
        )

    raw = path.read_bytes()

    if not raw.startswith(MAGIC):
        raise SaveError(
            "Unrecognized save format.",
            code="unknown_format",
        )

    remainder = raw[len(MAGIC):]

    if len(remainder) < 33:
        raise SaveError(
            "Save file is incomplete.",
            code="incomplete",
        )

    signature = remainder[:32]
    payload = remainder[32:]

    expected = hmac.digest(
        _get_key(),
        payload,
        "sha256",
    )

    if not hmac.compare_digest(
        signature,
        expected,
    ):
        raise SaveError(
            "Save authentication failed. "
            "The checkpoint may have been modified.",
            code="authentication_failed",
        )

    # Only authenticated server checkpoints
    # are eligible for deserialization.
    try:
        data = pickle.loads(payload)
    except Exception as exc:
        raise SaveError(
            "Cannot restore this checkpoint. "
            "It may be incompatible with the current code.",
            code="incompatible_code",
        ) from exc

    if not isinstance(data, dict):
        raise SaveError(
            "Invalid checkpoint structure.",
            code="invalid_structure",
        )

    if data.get("version") != SAVE_VERSION:
        raise SaveError(
            "Unsupported checkpoint version.",
            code="unsupported_version",
            format_version=(
                data.get("version")
                if type(data.get("version")) is int
                else None
            ),
        )

    if not isinstance(data.get("game"), Game):
        raise SaveError(
            "Checkpoint does not contain a Game.",
            code="invalid_structure",
        )

    if not isinstance(data.get("history"), list):
        raise SaveError(
            "Checkpoint history is invalid.",
            code="invalid_structure",
        )

    if not isinstance(
        data.get("next_event_id"),
        int,
    ):
        raise SaveError(
            "Checkpoint event sequence is invalid.",
            code="invalid_structure",
        )

    metadata = data.get("metadata")

    if (
        not isinstance(metadata, dict)
        or not all(
            key in metadata
            for key in (
                "round",
                "current_player",
                "game_over",
            )
        )
    ):
        raise SaveError(
            "Checkpoint metadata is invalid.",
            code="invalid_structure",
        )

    return data



def save_game(
    slot: str,
    game: Game,
    history: list[dict],
    next_event_id: int,
) -> dict:
    path = _slot_path(slot)
    _ensure_directory()

    data = {
        "version": SAVE_VERSION,
        "game": game,
        "history": list(history),
        "next_event_id": next_event_id,
        "random_state": random.getstate(),
        "metadata": {
            "round": game.state.turn_number,
            "current_player": game.current_player.name,
            "game_over": game.state.game_over,
        },
    }

    try:
        payload = pickle.dumps(
            data,
            protocol=pickle.HIGHEST_PROTOCOL,
        )
    except Exception as exc:
        raise SaveError(
            "The current game could not be serialized."
        ) from exc

    signature = hmac.digest(
        _get_key(),
        payload,
        "sha256",
    )

    contents = MAGIC + signature + payload

    if len(contents) > MAX_SAVE_BYTES:
        raise SaveError("Checkpoint is too large.")

    # Write fully before replacing an existing save.
    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=SAVE_DIR,
            prefix=".saving-",
            suffix=".tmp",
            delete=False,
        ) as file:
            temporary_path = Path(file.name)
            file.write(contents)
            file.flush()
            os.fsync(file.fileno())

        os.replace(temporary_path, path)

    except OSError as exc:
        raise SaveError("Unable to write save file.") from exc

    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

    return {
        "slot": slot,
        **data["metadata"],
    }


def load_game(slot: str) -> dict[str, Any]:
    return _read_checkpoint(slot)



def list_saves() -> list[dict]:
    """Return read-only diagnostics for each fixed slot."""
    result = []

    for slot in ("slot1", "slot2", "slot3"):
        path = _slot_path(slot)

        try:
            exists = path.exists()

            if not exists:
                result.append({
                    "slot": slot,
                    "exists": False,
                    "valid": False,
                    "metadata": None,
                    "format_version": None,
                    "diagnostic": None,
                })
                continue

            data = _read_checkpoint(slot)

            result.append({
                "slot": slot,
                "exists": True,
                "valid": True,
                "metadata": data["metadata"],
                "format_version": data["version"],
                "diagnostic": None,
            })

        except SaveError as exc:
            result.append({
                "slot": slot,
                "exists": True,
                "valid": False,
                "metadata": None,
                "format_version": exc.format_version,
                "diagnostic": {
                    "code": exc.code,
                    "message": str(exc),
                },
            })

        except OSError:
            result.append({
                "slot": slot,
                "exists": True,
                "valid": False,
                "metadata": None,
                "format_version": None,
                "diagnostic": {
                    "code": "read_error",
                    "message": "Unable to read this save slot.",
                },
            })

    return result
