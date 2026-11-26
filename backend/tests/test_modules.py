from fastapi.testclient import TestClient

from app.main import app
from app.modules import MODULES, module_infos

client = TestClient(app)

EXPECTED_SLUGS = ["algebra", "analysis"]


def test_registry_lists_the_cipher_and_analysis_modules_in_order():
    assert [info.slug for info in module_infos()] == EXPECTED_SLUGS


def test_every_module_exposes_the_contract():
    for module in MODULES:
        assert module.INFO.slug
        assert module.router.prefix == f"/{module.INFO.slug}"


def test_modules_endpoint_reports_both_modules():
    response = client.get("/api/v1/modules")

    assert response.status_code == 200
    body = response.json()
    assert [m["slug"] for m in body] == EXPECTED_SLUGS
    # Both modules are implemented since v0.4.0.
    assert {m["status"] for m in body} == {"available"}


def test_the_retired_stub_modules_are_gone():
    for slug in ("logic", "sets", "combinatorics", "graphs"):
        assert client.post(f"/api/v1/{slug}", json={}).status_code == 404
