"""
Reserved for plan 02: a server-side gaze model, only if Phase 3's tracker comparison needs one.
Eye tracking runs in the browser by default, so this blueprint has no routes yet.
Add routes under /v1/gaze/* and protect each with `require_validation_device`.
"""
from flask import Blueprint

bp = Blueprint("gaze", __name__, url_prefix="/v1/gaze")
