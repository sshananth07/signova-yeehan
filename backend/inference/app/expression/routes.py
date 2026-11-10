"""Expression scoring for the grimace-triggered pain check (plan 03 Phase 4)."""
from flask import Blueprint, abort

from ..auth import require_validation_device

bp = Blueprint("expression", __name__, url_prefix="/v1")


@bp.post("/expression-check")
@require_validation_device
def expression_check():
    """
    Body (multipart): visitId, requestId, seq, crop (JPEG, <= 50 KB, 224x224).
    200: { visitId, requestId, seq, modelVersion, status: 'ok' | 'unusable', score? }

    TODO(plan 03 Tasks 4.1-4.3):
      1. Validate fields against shared/contracts JSON Schema (dist/schema) once plan 03 adds it.
      2. Decode the crop from the request stream IN MEMORY (no temp files); not a JPEG → 400.
      3. `models.registry.get("expression").score(image)` → score in 0..1, or None when unusable.
      4. Echo visitId/requestId/seq; include modelVersion. Drop all references to the image.
      Never log the body, the crop, or the score alongside identifiers.
    """
    abort(501, "Not implemented yet (plan 03 Task 4.1)")
