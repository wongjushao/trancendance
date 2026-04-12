import types

import pytest

from backend.services.notification_service.app import create_app


@pytest.fixture()
def app():
    app = create_app()
    app.config.update({"TESTING": True})
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["service"] == "notification"


def test_notification_requires_bearer(client, monkeypatch):
    # Force db_session to look configured for this test
    fake_db_session = types.SimpleNamespace(remove=lambda: None)
    monkeypatch.setattr(
        "backend.services.notification_service.app.create_engine_and_session",
        lambda _url: (None, fake_db_session),
    )

    app = create_app()
    app.config.update({"TESTING": True})
    test_client = app.test_client()

    resp = test_client.get("/notification")
    assert resp.status_code == 401
