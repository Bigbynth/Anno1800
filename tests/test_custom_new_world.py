import json
from collections import Counter
from pathlib import Path

import pytest
from anno1800.data.new_world import CUSTOM_NEW_WORLD_DATA, load_custom_new_world_cards
from anno1800.game_state import create_default_deck


def test_homebrew_deck_size_and_unique_ids():
    cards = load_custom_new_world_cards()
    assert len(cards) == 24
    assert len({c.id for c in cards}) == 24
    assert all(c.is_new_world and c.victory_points == 5 for c in cards)

def test_good_distribution_and_reward_budget():
    cards = load_custom_new_world_cards()
    distribution = Counter(g.value for c in cards for g in c.requirements)
    assert len(distribution) == 6
    assert set(distribution.values()) == {8}
    assert Counter(len(c.requirements) for c in cards) == {1: 6, 2: 12, 3: 6}
    assert all(not c.effects for c in cards if len(c.requirements) == 1)

def test_deck_opt_in_and_default_unchanged():
    default = create_default_deck()
    custom = create_default_deck(use_custom_population=True, use_custom_new_world=True)
    assert len(default.new_world_cards) == 24
    assert default.new_world_cards[0].id.startswith("fixture-")
    assert len(custom.new_world_cards) == 24
    assert len(custom.farmer_worker_cards) == 46
    assert len(custom.advanced_cards) == 32
    assert custom.new_world_cards[0].id.startswith("custom-new-world-")

def test_invalid_duplicate_id(tmp_path):
    records = json.loads(CUSTOM_NEW_WORLD_DATA.read_text(encoding="utf-8"))
    records[1]["id"] = records[0]["id"]
    path = tmp_path / "invalid.json"
    path.write_text(json.dumps(records), encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate"):
        load_custom_new_world_cards(path)
