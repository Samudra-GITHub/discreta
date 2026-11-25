from datetime import datetime

from fastapi.testclient import TestClient

from app import __version__
from app.main import app

client = TestClient(app)


def test_health_endpoint_reports_running_backend():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "discreta-backend"
    assert body["version"] == __version__
    assert "running" in body["message"].lower()
    datetime.fromisoformat(body["timestamp"])  # must be a valid ISO timestamp


def test_root_endpoint_describes_service():
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "DISCRETA"
    assert body["health"] == "/api/v1/health"


def test_unknown_route_returns_404():
    assert client.get("/api/v1/does-not-exist").status_code == 404
