import logging
import time
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.core.config import settings

logger = logging.getLogger("backend.database")

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    is_sqlite = db_url.startswith("sqlite")

    try:
        if is_sqlite:
            engine = create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                echo=settings.DEBUG,
            )
        else:
            engine = create_engine(
                db_url,
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_pre_ping=True,
                echo=settings.DEBUG,
            )
        # Test connection immediately
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Database connection verified successfully with URL dialect: {engine.dialect.name}")
        return engine
    except Exception as e:
        logger.warning(
            f"Failed to connect to configured DATABASE_URL ({db_url}): {e}. "
            "Falling back to local SQLite database for development stability."
        )
        fallback_url = "sqlite:///./route_planner_part_a.db"
        fallback_engine = create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
        return fallback_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> dict:
    """Utility to check database health and query latency."""
    start = time.time()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.time() - start) * 1000, 2)
        return {
            "status": "connected",
            "dialect": engine.dialect.name,
            "latency_ms": latency_ms,
            "pool_size": getattr(engine.pool, "size", lambda: 1)(),
        }
    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "dialect": engine.dialect.name,
        }
