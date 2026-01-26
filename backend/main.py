from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from db.database import init_db
from api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    await init_db()
    yield


# Create FastAPI app
app = FastAPI(
    title="CodePathfinder API",
    description="AI-powered open source contribution mentor using multi-agent systems",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1", tags=["agents"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to CodePathfinder API",
        "description": "Your Personal Open Source Mentor powered by AI Agents",
        "docs": "/docs",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()

    uvicorn.run(
        "backend.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
