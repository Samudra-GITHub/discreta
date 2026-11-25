from fastapi.testclient import TestClient

from app.main import app
from app.modules import MODULES, module_infos

client = TestClient(app)

EXPECTED_SLUGS = ["logic", "sets", "combinatorics", "graphs", "algebra"]


def test_registry_contains_the_five_modules_in_order():
    assert [info.slug for info in module_infos()] == EXPECTED_SLUGS


def test_every_module_exposes_the_contract():
    for module in MODULES:
        assert module.INFO.slug
        assert module.router.prefix == f"/{module.INFO.slug}"


def test_modules_endpoint_is_honest_about_status():
    response = client.get("/api/v1/modules")

    assert response.status_code == 200
    body = response.json()
    assert [m["slug"] for m in body] == EXPECTED_SLUGS
    assert all(m["status"] == "planned" for m in body)
