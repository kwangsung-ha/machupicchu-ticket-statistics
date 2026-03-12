from fastapi import FastAPI, Depends, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select, func
from backend.db.session import init_db, get_session
from backend.models.availability import Circuit, AvailabilityLog
from backend.services.crawler import crawl_and_save
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import uvicorn
import os

# 스케줄러 설정
scheduler = BackgroundScheduler()
scheduler.add_job(crawl_and_save, 'interval', minutes=30)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="Machu Picchu Ticket Monitor", lifespan=lifespan)

# --- API Routes (반드시 정적 파일 서빙보다 위에 있어야 함) ---

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/crawl/now")
def trigger_crawl():
    crawl_and_save()
    return {"message": "Crawl triggered successfully"}

@app.get("/api/availability/current")
def get_current_availability(session: Session = Depends(get_session)):
    circuits = session.exec(select(Circuit)).all()
    results = []
    for circuit in circuits:
        statement = select(AvailabilityLog).where(
            AvailabilityLog.nidRuta == circuit.nidRuta
        ).order_by(AvailabilityLog.timestamp.desc()).limit(1)
        latest_log = session.exec(statement).first()
        if latest_log:
            results.append({
                "nidRuta": circuit.nidRuta,
                "circuit": circuit.circuito,
                "route": circuit.ruta,
                "total": latest_log.total,
                "booked": latest_log.booked,
                "available": latest_log.available,
                "timestamp": latest_log.timestamp
            })
    return results

from typing import List, Optional

# ... (기존 임포트 유지) ...

def get_peru_now():
    return datetime.utcnow() - timedelta(hours=5)

@app.get("/api/availability/history")
def get_availability_history(
    nidRuta: Optional[int] = Query(default=None), 
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    session: Session = Depends(get_session)
):
    """지정된 날짜 범위 내의 모든 히스토리 데이터 조회 (시간대 정보 보존)"""
    
    peru_now = get_peru_now()
    if not start_date:
        start_dt = peru_now - timedelta(days=7)
    else:
        start_dt = datetime.fromisoformat(start_date)
        
    if not end_date:
        end_dt = peru_now
    else:
        end_dt = datetime.fromisoformat(end_date)
    
    # 집계 로직을 제거하고 모든 로그를 Join하여 반환
    statement = select(AvailabilityLog, Circuit.ruta).join(
        Circuit, AvailabilityLog.nidRuta == Circuit.nidRuta
    ).where(
        AvailabilityLog.timestamp >= start_dt,
        AvailabilityLog.timestamp <= end_dt
    ).order_by(AvailabilityLog.timestamp.asc())
    
    if nidRuta is not None:
        statement = statement.where(AvailabilityLog.nidRuta == nidRuta)
        
    results = session.exec(statement).all()
    
    return [
        {
            **log.model_dump(),
            "route": ruta
        } for log, ruta in results
    ]

# Hourly stats endpoint 제거됨 (요청에 따라)

# --- Static Files Serving (React Frontend) ---

FRONTEND_DIST = "frontend/dist"

if os.path.exists(FRONTEND_DIST):
    # assets 폴더 (JS, CSS 등) 마운트
    app.mount("/assets", StaticFiles(directory=f"{FRONTEND_DIST}/assets"), name="assets")

    # 나머지 모든 경로는 index.html로 연결 (React Router 지원)
    @app.get("/{rest_of_path:path}")
    async def react_app(rest_of_path: str):
        # 파일이 실제로 존재하면 해당 파일 반환
        file_path = os.path.join(FRONTEND_DIST, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # 그 외에는 무조건 index.html (SPA 구조)
        return FileResponse(f"{FRONTEND_DIST}/index.html")
else:
    print(f"Warning: {FRONTEND_DIST} not found. Frontend will not be served.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
