# Roadhouse

Roadhouse keeps a band's gigs and people in one place. This repository currently contains the first vertical slice: demo role entry, member roster, booked gigs, show-day schedule, and assignment-based gig detail visibility.

## First Sprint Scope

- Managers can book gigs, choose full band/duo/trio, add schedule times, and optionally select required members.
- Assigned members can see full gig details. Other members see a non-interactive venue/date summary with no pay or contact, and cannot open the gig.
- Demo login offers Manager or Member profiles without passwords. It is a UI/API development shortcut, not authentication; do not expose this demo API to real band data.
- Other product areas remain future work. See [DECISIONS.md](DECISIONS.md) for the sprint assumptions.

## Local Development

Prerequisites: Python 3.13+, `uv`, Node 24, and Corepack/pnpm.

Backend, from `backend/`:

```sh
uv sync
uv run alembic upgrade head
uv run python -m app.seed_demo
uv run uvicorn app.main:app --reload
```

The API is at `http://localhost:8000`, OpenAPI docs at `/docs`, and health at `/health`.

Frontend, from `frontend/` in another terminal:

```sh
corepack pnpm install
corepack pnpm generate:api
corepack pnpm dev
```

The web app is at `http://localhost:5173`. The generated client schema is committed at `frontend/src/api/schema.d.ts`; rerun `pnpm generate:api` after backend API changes.

## Docker Compose

```sh
docker compose up --build
```

Open `http://localhost:8080`. SQLite persists in the `roadhouse-data` named volume. PostgreSQL is documented as a commented Compose service; set `DATABASE_URL` to `postgresql+psycopg://...` when enabling it.

## Checks

Backend, from `backend/`:

```sh
uv run ruff check app tests alembic
uv run ruff format --check app tests alembic
uv run mypy app
uv run pytest --cov=app --cov-report=term-missing:skip-covered --cov-fail-under=80
```

Frontend, from `frontend/`:

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:cov
corepack pnpm build
```