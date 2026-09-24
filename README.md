# MES_Admin

Next.js back-office for **[MES_Api](../MES_Api)** (FastAPI). It is the staff-facing tool used to
modify the data that the public MES apps read: universities and their study programs.

```
Browser  ──►  Next.js (this app, :3001)  ──►  FastAPI MES_Api (:8000)  ──►  PostgreSQL
                 │ server-side only
                 └─ JWT lives in an httpOnly cookie, it never reaches the browser
```

## Features

- **Login** – OAuth2 password login against `POST /api/v1/auth/login`; the JWT is stored in an
  `httpOnly` cookie by a Next.js route handler, so all API calls are proxied through the server.
- **Dashboard** – totals, draft/published breakdown, public/private split and API health.
- **Universities** – list with search + filters, create, full edit form, publish/unpublish,
  delete (with confirmation).
- **Programs** – add / edit / delete study programs nested under a university.

## Getting started

```bash
# 1. make sure MES_Api is running on :8000 (and Postgres is up)
cd ../MES_Api && uv run uvicorn app.main:app --reload

# 2. configure + run this app
cp .env.example .env.local     # defaults already work for local dev
npm install
npm run dev                    # http://localhost:3001
```

Default credentials come from `MES_Api/.env`
(`DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`, e.g. `admin@example.com` / `changeme123`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on http://localhost:3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on :3001 |
| `npm run typecheck` | `tsc --noEmit` |

## Project structure

```
src/
├── app/
│   ├── (app)/                  # authenticated area (sidebar + top bar shell)
│   │   ├── page.tsx            # dashboard
│   │   └── universities/       # list, new, [id] detail/edit
│   ├── login/page.tsx          # sign-in page (outside the shell)
│   └── api/
│       ├── login/route.ts      # POST credentials -> sets httpOnly JWT cookie
│       ├── logout/route.ts     # clears the cookie
│       └── admin/...           # thin proxies to MES_Api admin endpoints
├── components/
│   ├── ui/                     # button, input, select, card, badge, table...
│   ├── layout/                 # sidebar, top bar, breadcrumbs
│   └── universities/           # forms, program manager, danger zone
├── lib/
│   ├── config.ts               # API_URL
│   ├── auth.ts                 # cookie name / max age
│   ├── types.ts                # types mirroring the Pydantic schemas
│   ├── server-api.ts           # server-component fetch helpers (cookie -> Bearer)
│   └── api.ts                  # client fetch helpers (talks to /api/* proxies)
└── middleware.ts               # redirects to /login when no session cookie
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `API_URL` | `http://127.0.0.1:8000` | Base URL of MES_Api (server-side only) |
| `SESSION_MAX_AGE` | `1800` | Cookie lifetime in seconds; keep it equal to the API's `ACCESS_TOKEN_EXPIRE_MINUTES` |

When the token expires, the next API call returns `401` and the app redirects to `/login?expired=1`.

## Known API quirks handled by this app

- **Status is not in the admin schemas.** `UniversitySummary`/`UniversityDetail` omit `status`, so
  draft/published state is derived from the public list (`GET /api/v1/public/universities/`, which
  only returns published rows) - see `publishedIds()` in `src/lib/server-api.ts`.
- **Tuition is write-only.** `ProgramSummary` returns `tuition_fee` (always `null`, the model stores
  `tuition_per_year`/`tuition_per_credit` instead), so program forms send tuition fields only when
  the user types a value.
