"""Phase A contract: the service starts, health is live, model routes answer 501 in the shared error shape."""
import pytest

from app import create_app


@pytest.fixture()
def client():
    return create_app().test_client()


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


def test_expression_check_is_stubbed(client):
    r = client.post("/v1/expression-check")
    assert r.status_code == 501
    assert r.get_json()["error"]["code"] == "NOT_IMPLEMENTED"


def test_oversize_body_is_refused_before_reading(client):
    r = client.post("/v1/expression-check", data=b"x" * (65 * 1024), content_type="application/octet-stream")
    assert r.status_code == 413
    assert r.get_json()["error"]["code"] == "TOO_LARGE"


def test_unknown_route_uses_the_error_shape(client):
    r = client.get("/v1/nope")
    assert r.status_code == 404
    assert r.get_json()["error"]["code"] == "NOT_FOUND"
