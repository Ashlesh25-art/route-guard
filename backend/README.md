# RouteGuard Backend

## Project Structure Summary
- `app/main.py`: Entry point for the FastAPI application.
- `app/models/`: Database models (PostgreSQL/SQLAlchemy).
- `app/schemas/`: Pydantic models for request/response validation.
- `app/routers/`: API endpoints organized by domain.
- `app/services/`: Business logic and external integrations.
- `app/ml/`: Machine learning inference and feature building logic.
- `app/database/`: Database connection clients (PostgreSQL, MongoDB, Redis).
- `app/background/`: APScheduler jobs for monitoring and retraining.
