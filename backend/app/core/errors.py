"""Uniform error responses for the whole API.

Every client-facing error has the same JSON shape, a superset-compatible form of the one
FastAPI uses::

    {"detail": [{"loc": ["body", "key"], "msg": "...", "type": "less_than_equal"}]}

Design rules:

* ``detail`` is *always* a list of ``{loc, msg, type}`` objects.
* The offending input is **never** echoed back. This keeps responses small, avoids reflecting
  attacker-controlled data, and removes the cases (NaN, Infinity, unpaired surrogates) that
  cannot be serialised.
* The body is encoded with ``ensure_ascii=True`` and ``allow_nan=False`` so it can always be
  written, whatever characters appear in a field name.
* Only expected client errors are shaped here. Unexpected exceptions stay HTTP 500 with a
  fixed, generic message; no exception text or stack trace reaches the client.
"""

from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response

#: At most this many problems are reported for one request, so a body full of unknown
#: fields cannot be amplified into a much larger response.
MAX_REPORTED_ERRORS = 20

_MAX_LOC_ITEM_CHARS = 80
_MAX_MESSAGE_CHARS = 300

_HTTP_ERROR_TYPES: Mapping[int, str] = {
    400: "bad_request",
    404: "not_found",
    405: "method_not_allowed",
    413: "payload_too_large",
}


class ErrorDetail(BaseModel):
    """One problem. ``loc`` names the field, ``type`` is a stable machine-readable code."""

    loc: list[str | int]
    msg: str
    type: str


class ErrorResponse(BaseModel):
    """Body of every client error (HTTP 4xx) and of HTTP 500."""

    detail: list[ErrorDetail]


class ClientError(Exception):
    """An expected, client-caused failure (for example a mathematically invalid key)."""

    def __init__(
        self,
        status_code: int,
        error_type: str,
        message: str,
        loc: Sequence[str | int] = (),
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_type = error_type
        self.message = message
        self.loc = tuple(loc)


def _clip(value: object, limit: int) -> str:
    text = value if isinstance(value, str) else str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _safe_loc(loc: Sequence[object]) -> list[str | int]:
    return [
        item
        if isinstance(item, int) and not isinstance(item, bool)
        else _clip(item, _MAX_LOC_ITEM_CHARS)
        for item in loc
    ]


def error_response(
    status_code: int,
    details: Sequence[Mapping[str, Any]],
    headers: Mapping[str, str] | None = None,
) -> Response:
    """Build a JSON error response that is guaranteed to serialise."""
    shown = list(details[:MAX_REPORTED_ERRORS])
    omitted = len(details) - len(shown)
    if omitted > 0:
        shown.append({"loc": [], "msg": f"{omitted} more problems not shown.", "type": "truncated"})

    payload = {
        "detail": [
            {
                "loc": _safe_loc(d.get("loc", ())),
                "msg": _clip(d.get("msg", "Invalid request."), _MAX_MESSAGE_CHARS),
                "type": _clip(d.get("type", "error"), 64),
            }
            for d in shown
        ]
    }
    body = json.dumps(payload, ensure_ascii=True, allow_nan=False).encode("ascii")
    return Response(
        content=body,
        status_code=status_code,
        media_type="application/json",
        headers=dict(headers) if headers else None,
    )


async def _handle_validation_error(_: Request, exc: Exception) -> Response:
    assert isinstance(exc, RequestValidationError)
    details = [
        {
            "loc": error.get("loc", ()),
            "msg": error.get("msg", "Invalid value."),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()  # deliberately ignores error["input"] and error["ctx"]
    ]
    return error_response(422, details)


async def _handle_client_error(_: Request, exc: Exception) -> Response:
    assert isinstance(exc, ClientError)
    return error_response(
        exc.status_code, [{"loc": exc.loc, "msg": exc.message, "type": exc.error_type}]
    )


async def _handle_http_exception(_: Request, exc: Exception) -> Response:
    assert isinstance(exc, StarletteHTTPException)
    message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    error_type = _HTTP_ERROR_TYPES.get(exc.status_code, "http_error")
    return error_response(
        exc.status_code, [{"loc": [], "msg": message, "type": error_type}], headers=exc.headers
    )


async def _handle_unexpected_error(_: Request, __: Exception) -> Response:
    # Fixed text on purpose: nothing about the failure is revealed to the client. Starlette
    # re-raises after sending this, so the server log still records the full traceback.
    return error_response(
        500, [{"loc": [], "msg": "Internal server error.", "type": "internal_error"}]
    )


def register_error_handlers(app: FastAPI) -> None:
    """Install the uniform handlers on ``app``."""
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(ClientError, _handle_client_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)
