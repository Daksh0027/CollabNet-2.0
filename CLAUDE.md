# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
CollaboNet is a sponsor and creator collaboration marketplace consisting of:
- **Frontend**: React application (Tailwind CSS, Radix UI, TanStack Query)
- **Backend**: Modular FastAPI (Python) API with async Motor (MongoDB) persistence
- **Root Orchestration**: Unified `npm run ___` command runner from the root

## Common Commands (Run from repository root)

### Development & Docker
- `npm run dev`: Start backend (Docker Compose) in background and frontend dev server
- `npm run dev:frontend`: Start only frontend dev server (http://localhost:3000)
- `npm run dev:backend`: Run Docker Compose backend + MongoDB in foreground
- `npm run dev:backend:d`: Run Docker Compose backend + MongoDB in background
- `npm run dev:down`: Stop Docker containers
- `npm run docker:logs`: Tail backend logs

### Testing & Quality
- `npm test`: Run full test suite (backend Pytest + frontend Jest, 101 tests total)
- `npm run test:backend`: Run Pytest in Docker container (36 tests)
- `npm run test:frontend`: Run Jest in frontend (65 tests across 13 suites)
- `npm run test:notifications`: Run backend and frontend notification suites
- `npm run test:seeding`: Run database schema, index constraints, and seeding integrity tests
- `npm run typecheck`: Run TypeScript compiler check for landing modules
- `npm run health`: Check backend health check endpoint

### Build & Seed
- `npm run build`: Build production frontend bundle (`frontend/build/`)
- `npm run build:backend`: Build backend Docker image
- `npm run build:all`: Build both frontend and backend
- `npm run seed`: Seed demo accounts, campaigns, and contracts into MongoDB idempotently
- `npm run seed:reset`: Wipe collections, rebuild indexes, and re-seed pristine data
- `npm run seed:status`: Print real-time collection counts
- `npm run seed:clean`: Clear all data collections
- `npm run clean`: Clean frontend build artifacts

## Architecture & Codebase Conventions
- **Backend Modular Architecture**:
  - `backend/core/`: Configuration (`config.py`), database client (`database.py`), security & tokens (`security.py`), and FastAPI auth dependencies (`dependencies.py`).
  - `backend/routers/`: Domain route handlers (`auth.py`, `creators.py`, `campaigns.py`, `collaborations.py`, `contracts.py`, `messages.py`, `calendar.py`, `notifications.py`, `overview.py`, `payments.py`, `ai.py`).
  - `backend/services/`: Reusable business logic (`contract_service.py`, `escrow_service.py`, `chat_service.py`, `notification_service.py`, `ai_service.py`).
  - `backend/seeds/`: Index definitions and demo data seeding (`demo_data.py`).
  - `backend/server.py`: Lean FastAPI application entry point.
- **Frontend Conventions**:
  - Shared marketplace constants reside in `frontend/src/constants/marketplace.js`.
  - Formatters reside in `frontend/src/utils/formatters.js`.
  - Status styles reside in `frontend/src/constants/statusStyles.js`.
  - Network API client resides in `frontend/src/lib/api.js`.
- **Environment**:
  - Backend configuration: `backend/.env` (template: `backend/.env.example`)
  - Frontend configuration: `frontend/.env` (template: `frontend/.env.example`)
