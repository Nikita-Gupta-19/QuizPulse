from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.settings import settings
from app.database.connection import database
from app.routes import users, exams, quiz, analytics
from app.utils.websocket import manager
from datetime import datetime

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    database.connect()
    yield
    # Shutdown actions
    database.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SkillBytes QuizPulse Backend - WhatsApp Vibe & SaaS Analytics",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Next.js client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(users.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.websocket("/api/ws/leaderboard")
async def websocket_leaderboard_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket connection alive, listen for messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket connection error: {e}")
        manager.disconnect(websocket)

@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Standard diagnostic check reporting server online status.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "QuizPulse Backend API"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
