"""Request-body size limit, enforced before the body is parsed or validated."""

from __future__ import annotations

from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import error_response


class BodySizeLimitMiddleware:
    """Reject request bodies larger than ``max_body_bytes`` with HTTP 413.

    Two checks, because a client controls both:

    1. A declared ``Content-Length`` above the limit is refused immediately, before any of
       the body is read.
    2. Bodies sent without a (truthful) length, such as chunked uploads, are counted as they
       stream in; reading stops as soon as the limit is crossed.

    The streaming failure is raised as an ``HTTPException`` so FastAPI passes it through
    instead of reporting it as a generic body-parsing error, and the application's uniform
    error handler turns it into the 413 response.
    """

    def __init__(self, app: ASGIApp, max_body_bytes: int) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    def _too_large(self) -> HTTPException:
        return HTTPException(
            status_code=413,
            detail=f"Request body too large: the limit is {self.max_body_bytes} bytes.",
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = _declared_length(scope)
        if declared is not None and declared > self.max_body_bytes:
            problem = self._too_large()
            response = error_response(
                413,
                [{"loc": [], "msg": str(problem.detail), "type": "payload_too_large"}],
                headers={"Connection": "close"},
            )
            await response(scope, receive, send)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_bytes:
                    raise self._too_large()
            return message

        await self.app(scope, limited_receive, send)


def _declared_length(scope: Scope) -> int | None:
    for name, value in scope.get("headers", []):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return None  # malformed header: fall back to counting the stream
    return None
