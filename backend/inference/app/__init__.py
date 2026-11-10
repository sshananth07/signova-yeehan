"""Signova inference service (plan 00 Task A.4). Heavy models only; holds no data."""
from flask import Flask, abort, jsonify, request
from werkzeug.exceptions import HTTPException

from .config import Config
from .expression.routes import bp as expression_bp
from .gaze.routes import bp as gaze_bp

# Same codes as shared/contracts ErrorCode, so the frontend handles both services alike.
_CODES = {400: "VALIDATION", 401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND",
          413: "TOO_LARGE", 429: "RATE_LIMITED", 501: "NOT_IMPLEMENTED"}


def create_app(config: Config | None = None) -> Flask:
    cfg = config or Config()
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = cfg.max_content_length
    app.config["SIGNOVA"] = cfg

    app.register_blueprint(expression_bp)  # plan 03
    app.register_blueprint(gaze_bp)  # plan 02 (reserved)

    @app.before_request
    def refuse_oversize():
        # Werkzeug only enforces MAX_CONTENT_LENGTH when the body is read; refuse up front instead.
        if (request.content_length or 0) > cfg.max_content_length:
            abort(413, "Request is too large.")

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    @app.errorhandler(HTTPException)
    def http_error(e: HTTPException):
        # Never echo request data back, and never log it (images must not reach logs).
        code = _CODES.get(e.code or 500, "INTERNAL")
        return jsonify(error={"code": code, "message": e.description or e.name}), e.code

    @app.errorhandler(Exception)
    def unknown_error(e: Exception):
        # TODO(B.13): log type(e).__name__ only (no message: it may contain request data), then answer 500.
        return jsonify(error={"code": "INTERNAL", "message": "Something went wrong."}), 500

    return app
