# CollaboNet

CollaboNet is a sponsor and creator collaboration marketplace. The project
contains a React frontend, a FastAPI backend, and MongoDB for persistence.

## Requirements

- Docker Desktop with the Linux engine enabled
- Node.js and npm for the frontend
- PowerShell on Windows

## Project layout

```text
backend/             FastAPI API and backend dependencies
frontend/            React application
docker-compose.yml   Backend and MongoDB services
```

## Run locally

### 1. Start the backend and MongoDB

From the repository root:

```powershell
docker compose up --build
```

This starts:

- Backend API: http://localhost:8000
- MongoDB: internal Docker service on port 27017

The backend seeds demo data on its first startup. Verify that it is running:

```powershell
Invoke-WebRequest http://localhost:8000/api/
```

Expected response:

```json
{"message":"CollaboNet API running"}
```

To run the services in the background:

```powershell
docker compose up --build -d
docker compose ps
```

View backend logs:

```powershell
docker compose logs -f backend
```

Stop the services:

```powershell
docker compose down
```

MongoDB data is stored in the Docker volume `mongo_data`. To remove the
database volume as well:

```powershell
docker compose down -v
```

### 2. Start the frontend

Open a second PowerShell window:

```powershell
cd "C:\Users\DR4KEN\Documents\CollabNet 2.0\frontend"
npm install --legacy-peer-deps
npm start
```

Open http://localhost:3000 in a browser. The frontend is configured through
`frontend/.env` to use `http://localhost:8000`.

Use the Creator or Company demo account buttons to sign in locally. Google
login is intentionally disabled in local mode.

## Environment configuration

Backend configuration is in `backend/.env`. A template is available at
`backend/.env.example`.

Required for the local Docker setup:

```dotenv
MONGO_URL=mongodb://mongo:27017
DB_NAME=collabonet
CORS_ORIGINS=http://localhost:3000
```

Optional integrations:

- `AI_API_KEY` enables AI summaries, drafts, and rate benchmarking.
- `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` enable Stripe escrow payments.
- `AUTH_EXCHANGE_URL` enables an external authentication provider. Leave it
  empty for local demo-account authentication.

Frontend configuration is in `frontend/.env`:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
```

Do not commit real API keys or secrets.

## Frontend commands

Run these from `frontend/`:

```powershell
npm start       # development server at http://localhost:3000
npm run build   # production build in frontend/build
npm test        # test runner
```

If dependencies were removed during cleanup, run:

```powershell
npm install --legacy-peer-deps
```

## Backend commands

The recommended way to run the backend is Docker Compose. For local Python
development without Docker, install MongoDB separately, configure
`backend/.env` with `MONGO_URL=mongodb://localhost:27017`, then run:

```powershell
cd "C:\Users\DR4KEN\Documents\CollabNet 2.0\backend"
python -m pip install -r requirements.txt
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

## Troubleshooting

### Docker cannot connect to the engine

Start Docker Desktop and ensure the Linux container engine is running, then
retry:

```powershell
docker compose up --build
```

### Backend restarts with a missing Python module

Rebuild the image so changes to `backend/requirements.txt` are installed:

```powershell
docker compose build --no-cache backend
docker compose up
```

### Tailwind or module resolution errors in VS Code

Install frontend dependencies from `frontend/`:

```powershell
npm install --legacy-peer-deps
```

Then reload the VS Code window if the Tailwind CSS extension still shows stale
diagnostics.
