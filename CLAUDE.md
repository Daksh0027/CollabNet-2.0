# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
CollaboNet is a sponsor and creator collaboration marketplace consisting of:
- **Frontend**: React application (Next.js/Tailwind CSS)
- **Backend**: FastAPI (Python) API
- **Persistence**: MongoDB

## Common Commands

### Backend
Run from the root directory:
- **Start with Docker (Recommended)**: `docker compose up --build` (API: http://localhost:8000)
- **Run in background**: `docker compose up --build -d`
- **Stop services**: `docker compose down`
- **View logs**: `docker compose logs -f backend`
- **Local Python development**:
  ```powershell
  cd backend
  python -m pip install -r requirements.txt
  python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
  ```

### Backend Testing
Run from `backend/`:
- **Run all tests**: `pytest`
- **Run single test file**: `pytest tests/test_file.py`
- **Run specific test**: `pytest tests/test_file.py::test_function`
- **Note**: `pytest.ini` is configured with `pytest-xdist` (`-n 2 --dist loadscope`).

### Frontend
Run from `frontend/`:
- **Install dependencies**: `npm install --legacy-peer-deps`
- **Development server**: `npm start` (http://localhost:3000)
- **Production build**: `npm run build`
- **Run tests**: `npm test`

## Architecture
- **API Layer**: FastAPI handles requests and communicates with MongoDB.
- **Integrations**: Located in `backend/emergentintegrations/` (e.g., Stripe for escrow payments).
- **Frontend Structure**: React components organized in `frontend/src/`.
- **Environment**:
  - Backend config: `backend/.env`
  - Frontend config: `frontend/.env`
