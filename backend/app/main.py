from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.gigs import router as gigs_router
from app.api.v1.members import router as members_router

app = FastAPI(title="Roadhouse API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Demo-Role", "X-Demo-Member-Id"],
)
app.include_router(gigs_router, prefix="/api/v1")
app.include_router(members_router, prefix="/api/v1")


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(
    request: Request, error: StarletteHTTPException
) -> JSONResponse:
    del request
    code = {
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "invalid_request",
    }.get(error.status_code, "request_failed")
    detail = error.detail if isinstance(error.detail, str) else "The request failed."
    return JSONResponse(
        status_code=error.status_code,
        content={"code": code, "detail": detail},
        headers=error.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, error: RequestValidationError
) -> JSONResponse:
    del request, error
    return JSONResponse(
        status_code=422,
        content={"code": "validation_error", "detail": "Check the request fields."},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
