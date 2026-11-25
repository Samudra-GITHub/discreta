from fastapi.testclient import TestClient

from app.main import create_app
from app.core.config import Settings, get_settings


def _preflight(client: TestClient, origin: str):
    return client.options(
        "/api/v1/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )


def test_local_vite_origin_is_allowed():
    client = TestClient(create_app())

    response = _preflight(client, "http://localhost:5173")

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_foreign_origin_is_rejected():
    client = TestClient(create_app())

    response = _preflight(client, "https://evil.example")

    assert "access-control-allow-origin" not in response.headers


def test_origins_can_be_overridden_by_environment(monkeypatch):
    monkeypatch.setenv("DISCRETA_CORS_ORIGINS", "http://localhost:3000/, http://example.test")

    settings = get_settings()

    assert settings.cors_origins == ("http://localhost:3000", "http://example.test")
    assert isinstance(settings, Settings)
