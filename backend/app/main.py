from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from .seed import seed_if_empty
    from .database import async_session
    async with async_session() as session:
        await seed_if_empty(session)
    yield


app = FastAPI(title="AfCEN CDE Platform", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "AfCEN CDE"}


from .routers import projects, deliverables, benchmarks, flags, extractions, export  # noqa: E402

app.include_router(projects.router, prefix="/api")
app.include_router(deliverables.router, prefix="/api")
app.include_router(benchmarks.router, prefix="/api")
app.include_router(flags.router, prefix="/api")
app.include_router(extractions.router, prefix="/api")
app.include_router(export.router, prefix="/api")
