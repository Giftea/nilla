from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, DateTime, Float, JSON, Text, Enum
from datetime import datetime
from typing import AsyncGenerator
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./codepathfinder.db")

engine = create_async_engine(DATABASE_URL, echo=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class UserProfileDB(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    skill_level = Column(String, nullable=False)
    programming_languages = Column(JSON, nullable=False)
    interests = Column(JSON, nullable=False)
    time_commitment = Column(String, nullable=False)
    github_username = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ContributionOutcomeDB(Base):
    __tablename__ = "contribution_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    repo_name = Column(String, nullable=False)
    issue_number = Column(Integer, nullable=False)
    pr_url = Column(String, nullable=True)
    status = Column(String, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    user_feedback = Column(Text, nullable=True)


class EvaluationMetricDB(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String, nullable=False)
    metric_name = Column(String, nullable=False)
    metric_value = Column(Float, nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        yield session
