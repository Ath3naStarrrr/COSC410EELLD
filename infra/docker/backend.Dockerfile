FROM ghcr.io/astral-sh/uv:0.12.24 AS uv

FROM python:3.14-slim AS runtime
COPY --from=uv /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:$PATH"
WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/alembic.ini ./alembic.ini
COPY backend/alembic ./alembic
COPY backend/app ./app

RUN useradd --create-home --uid 10001 roadhouse \
    && mkdir -p /data \
    && chown -R roadhouse:roadhouse /app /data
USER roadhouse
ENV DATABASE_URL=sqlite:////data/roadhouse.db
EXPOSE 8000
HEALTHCHECK --interval=20s --timeout=3s --start-period=15s --retries=3 \
  CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/health', timeout=2)"
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed_demo && uvicorn app.main:app --host 0.0.0.0 --port 8000"]