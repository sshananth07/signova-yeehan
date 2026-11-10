"""
Model registry: one loaded model per kind, created once per process (plan 03 Task 4.3).

TODO(plan 03 Task 4.3):
  - `register(kind, factory)` and `get(kind)`; load lazily on first use, then keep in memory.
  - First adapter: ViTPain (`xinlei55555/ViTPain`, PSPI 0-16 scaled to 0..1). Record its file hash
    and licence (incl. the DINOv3 backbone licence) in docs/pain/models.md before shipping.
  - Each adapter exposes `version: str` and `score(image) -> float | None` (None = unusable face).
"""
from typing import Any, Callable

_factories: dict[str, Callable[[], Any]] = {}
_loaded: dict[str, Any] = {}
