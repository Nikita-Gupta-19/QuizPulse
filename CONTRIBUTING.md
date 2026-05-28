# Contributing to QuizPulse

Thank you for your interest in contributing to **QuizPulse**! This guide outlines the conventions and guidelines to maintain code quality, testability, and stability across our repository.

---

## 🛠️ Tech Stack & Conventions

* **Backend**: FastAPI (Python 3.13+), Async motor drivers, Pydantic v2 schemas.
* **Frontend**: Next.js 16 (App Router), Zustand states, Recharts, HSL-tailored vanilla CSS.
* **Database**: MongoDB (Local or Dockerized).

---

## 📝 Code Conventions

### 1. Backend Schemas (Pydantic v2)
* Always use Pydantic v2's modern validation syntax.
* Prefer field-level and model-level validators (`@field_validator`, `@model_validator`) to enforce consistency rather than throwing generic HTTPExceptions deep in route handlers.
* Example:
  ```python
  from pydantic import BaseModel, field_validator

  class SubmissionRequest(BaseModel):
      selectedOption: Optional[int]
      skipped: bool

      @field_validator("selectedOption")
      @classmethod
      def validate_option(cls, v):
          if v is not None and (v < 0 or v > 3):
              raise ValueError("Option must be between 0 and 3 inclusive")
          return v
  ```

### 2. Database Indexes (`backend/app/database/indexes.py`)
* Never perform operations on raw unindexed collections.
* When adding a new query pattern:
  * Review if an index or compound index is needed.
  * Register the index in `backend/app/database/indexes.py` with comments explaining the query alignment.
  * Re-run the database seeder to apply the changes.

### 3. Frontend Exports (Barrel Pattern)
* To keep the file hierarchy scalable and imports clean, use the **Barrel Export** pattern.
* Group files inside a folder under a single `index.ts` file, e.g.:
  ```typescript
  // frontend/src/components/shared/index.ts
  export { default as Navbar } from "./Navbar";
  export { default as Footer } from "./Footer";
  ```

---

## 🔌 WebSocket Protocols
* WebSocket connections are hosted at `/api/ws/leaderboard`.
* Route actions broadcast events (like `{"type": "LEADERBOARD_REFRESH"}`) to notify active clients to fetch latest leaderboard lists.
* When adding dynamic actions:
  * Register the event types in `app/utils/websocket.py` using `ConnectionManager`.

---

## 🧪 Testing Guidelines

* Write async integration tests for route endpoints using `pytest` and `httpx.AsyncClient`.
* Ensure that FastAPI lifespan hooks are called correctly during test runs.
* Avoid closed event loops by resetting database client contexts between tests. Use the `setup_db_connection` fixture.
* **Command to run tests**:
  ```bash
  cd backend
  source venv/bin/activate
  PYTHONPATH=. pytest
  ```
