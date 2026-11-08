# CollaboNet

CollaboNet is a modern sponsor and creator collaboration marketplace. The platform connects brands with verified creators, streamlines campaign discovery, facilitates escrow-backed milestone contracts, and provides real-time chat with rich media support.

---

## Architecture Overview

CollaboNet is structured as a modular full-stack application:

```text
collabonet/
├── backend/
│   ├── core/           # Configuration, Database (Motor), Security, Dependencies
│   ├── routers/        # Domain API endpoints (auth, creators, contracts, campaigns, etc.)
│   ├── services/       # Business logic (contract lifecycle, escrow, chat, notifications, AI)
│   ├── seeds/          # Database schema indexing and demo data seeding
│   ├── tests/          # Pytest integration and contract state test suites
│   └── server.py       # Slim FastAPI application entry point (<90 lines)
├── frontend/
│   ├── src/
│   │   ├── components/ # Reusable UI primitives and domain widgets
│   │   ├── constants/  # Canonical marketplace categories, niches, status tokens
│   │   ├── lib/        # HTTP client, authentication session, media helpers
│   │   ├── pages/      # Application views (Explore, Contracts, Messages, Calendar, etc.)
│   │   ├── utils/      # Formatting utilities (currency, numbers, dates)
│   │   └── landing/    # Single source of truth for the marketing landing page
│   └── public/
├── docs/               # Architectural decision logs, screenshots, and guides
├── scripts/            # Cross-platform orchestration helpers (environment init, health checks)
├── docker-compose.yml  # Multi-container orchestration (FastAPI backend + MongoDB)
└── package.json        # Unified root command runner (npm run ...)
```

---

## Prerequisites

- **Docker & Docker Compose** (Docker Desktop or Linux container engine)
- **Node.js** (v18+ recommended; v20/v22 tested) and **npm**

---

## Quick Start

### 1. Initialize & Install
From the repository root, run the setup command to initialize environment variables, install frontend dependencies, and build the Docker container:

```bash
npm run setup
```

### 2. Start the Development Environment
Start both the backend services in Docker and the frontend hot-reloading dev server with one command:

```bash
npm run dev
```

* **Frontend App**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:8000/api/](http://localhost:8000/api/)
* **Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

*Note: Sign in with the **Creator** or **Company** demo account buttons on the sign-in modal for immediate local access.*

---

## Command Reference (`npm run ___`)

All standard workflows can be run directly from the repository root:

| Command | Description |
| :--- | :--- |
| **`npm run setup`** | Initializes `.env` files, installs frontend packages, and builds Docker containers |
| **`npm run dev`** | Starts backend services in background (`docker compose up -d`) and starts frontend dev server |
| **`npm run dev:frontend`** | Starts only the React development server on port 3000 |
| **`npm run dev:backend`** | Runs backend and MongoDB in the foreground with live logs |
| **`npm run dev:backend:d`** | Runs backend and MongoDB in the background (detached) |
| **`npm run dev:down`** | Stops all local Docker containers |
| **`npm test`** | Runs the full test suite (backend pytest + frontend jest, 101 tests) |
| **`npm run test:backend`** | Runs backend pytest suite inside the container (`36/36 passed`) |
| **`npm run test:frontend`** | Runs frontend Jest test suite (`65/65 passed across 13 suites`) |
| **`npm run test:notifications`** | Runs both backend and frontend notification suites end-to-end |
| **`npm run test:seeding`** | Verifies database schema, index constraints, and seeding integrity |
| **`npm run test:frontend:watch`** | Runs frontend tests in interactive watch mode |
| **`npm run typecheck`** | Validates TypeScript types across landing and shared modules |
| **`npm run build`** | Builds the optimized production frontend bundle in `frontend/build` |
| **`npm run build:backend`** | Builds the backend Docker image |
| **`npm run build:all`** | Compiles both frontend bundle and backend Docker image |
| **`npm run seed`** | Seeds demo accounts, campaigns, and contracts idempotently |
| **`npm run seed:reset`** | Wipes collections, rebuilds indexes, and seeds fresh demo data in <1s |
| **`npm run seed:status`** | Displays real-time document counts across all 15 database collections |
| **`npm run seed:clean`** | Empties all collections for clean automated testing |
| **`npm run health`** | Runs a cross-platform diagnostic ping against the API health check endpoint |
| **`npm run docker:logs`** | Streams live logs from the backend container |
| **`npm run docker:restart`** | Restarts backend and database containers |
| **`npm run docker:clean`** | Tears down containers and deletes the `mongo_data` volume |
| **`npm run clean`** | Removes generated frontend build artifacts and caches |

---

## Environment Configuration

### Backend (`backend/.env`)
A template is provided in `backend/.env.example`:

```dotenv
MONGO_URL=mongodb://mongo:27017
DB_NAME=collabonet
CORS_ORIGINS=http://localhost:3000
SECRET_KEY=change-this-in-production-use-a-strong-secret-key-32chars

# Optional Integrations
AI_API_KEY=               # Enables OpenRouter AI summaries, drafts, rate benchmarking
STRIPE_API_KEY=           # Enables Stripe escrow checkout
STRIPE_WEBHOOK_SECRET=    # Stripe webhook validation secret
AUTH_EXCHANGE_URL=        # External OAuth/SSO provider (empty for local demo auth)
```

### Frontend (`frontend/.env`)
A template is provided in `frontend/.env.example`:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
ENABLE_HEALTH_CHECK=false
```

---

## Testing & Quality Gates

The codebase enforces strict test guarantees and clean domain boundaries across 101 unit and integration tests:

```bash
# Run all tests (backend pytest + frontend jest)
npm test

# Run backend pytest only (36/36 passed)
npm run test:backend

# Run frontend Jest only (65/65 passed)
npm run test:frontend

# Run notification test suites end-to-end (backend + frontend)
npm run test:notifications

# Run database seeding integrity tests
npm run test:seeding

# Validate TypeScript tokens & landing types
npm run typecheck
```

---

## Data Seeding & Testing Architecture

The data seeding setup is modular, deterministic, and isolated:

```text
backend/seeds/
├── cli.py            # CLI entry point (python -m seeds.cli [--reset|--clean|--status|--seed])
├── runner.py         # Async orchestration (seed_all, reset_all, clear_all, get_seed_status)
├── indexes.py        # MongoDB index definitions (unique constraints, timeline indexes)
└── datasets/         # Fully enriched, typed domain records
    ├── users.py          # 6 verified creators with projects/terms + 3 verified brands
    ├── campaigns.py      # Demo campaigns with deliverables & deadlines
    ├── connections.py    # Connections and collaboration requests
    ├── threads.py        # Chat threads with timestamps & read receipts
    ├── contracts.py      # Active/completed contracts, versions, reviews, events
    └── notifications.py  # Strongly typed notifications with explicit origins & actor IDs
```

### Seeding Commands
```bash
# Display live collection counts across MongoDB
npm run seed:status

# Reset database to a pristine demo state in <1 second
npm run seed:reset

# Clear all data collections
npm run seed:clean
```

### Notification Testing Setup
Notifications are tested comprehensively without brittle string scraping or concurrency races:
* **Backend (`backend/tests/test_notifications.py`)**: Tests unauthenticated guard (401), category breakdown (`all`, `creators`, `companies`), individual read status (`POST /api/notifications/{id}/read`), bulk marking read (`POST /api/notifications/read`), and cursor pagination (`next_offset`).
* **Frontend (`frontend/src/pages/Notifications.test.js`)**: Tests category filtering, empty state, automated read emission on page load, notification badge rendering, and pagination using standard `@tanstack/react-query` test harnesses and React 19 testing standards.

---

## Production Build & Deployment

To produce production-ready assets:

1. **Frontend Production Build**:
   ```bash
   npm run build
   ```
   Outputs static production files to `frontend/build/` suitable for CDN, S3, Vercel, or Nginx.

2. **Backend Production Container**:
   ```bash
   npm run build:backend
   ```
   Generates the containerized FastAPI production image running Uvicorn.
