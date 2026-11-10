"""Who may call the inference service (plan 00 Task B.13)."""
from functools import wraps

from flask import abort


def require_validation_device(view):
    """
    Allows only enrolled devices in validation mode. Decorate every model route with it.

    TODO(B.13):
      1. Read `Authorization: Bearer <idToken>`; missing → abort(401).
      2. `firebase_admin.auth.verify_id_token(token, check_revoked=True)`; invalid → abort(401).
      3. claims["kind"] != "device" → abort(403) (staff and stations never send face crops).
      4. Load devices/{claims["deviceId"]} with firebase_admin.firestore (cache 60 s);
         revokedAt set or validationMode != True → abort(403).
      5. Put the device id on `flask.g.device_id`, then call the view.
      Tests: non-device token 403; validationMode false 403; 65 KB body 413 (MAX_CONTENT_LENGTH).
    """
    @wraps(view)
    def wrapper(*args, **kwargs):
        abort(501, "Not implemented yet (plan 00 Task B.13)")
        return view(*args, **kwargs)

    return wrapper
