import datetime
from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT / "kitchenguard.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="staff")  # "admin" or "staff"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scans = relationship(
        "AuditScan", back_populates="user", cascade="all, delete-orphan"
    )


class AuditScan(Base):
    __tablename__ = "audit_scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    media_type = Column(String, default="image")  # "image" or "video"
    original_filename = Column(String, nullable=True)
    snapshot_path = Column(String, nullable=True)  # Relative path to annotated file
    total_detections = Column(Integer, default=0)
    total_violations = Column(Integer, default=0)
    is_compliant = Column(Boolean, default=True)
    inference_time_ms = Column(Float, default=0.0)
    notification_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="scans")
    violations = relationship(
        "ViolationLog", back_populates="scan", cascade="all, delete-orphan"
    )


class ViolationLog(Base):
    __tablename__ = "violations_log"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("audit_scans.id"), nullable=False)
    violation_type = Column(
        String, nullable=False
    )  # "no_hairnet", "no_mask", "no_gloves"
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("AuditScan", back_populates="violations")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    print(f"[DB] Database initialized at: {DB_PATH}")


if __name__ == "__main__":
    init_db()
