"""마추픽추 티켓 모니터링 시스템 메인 FastAPI 애플리케이션"""
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlmodel import Session, col, select

from backend.db.session import get_session, init_db
from backend.models.availability import AvailabilityLog, Circuit
from backend.services.crawler import crawl_and_save

# 스케줄러 설정
scheduler = BackgroundScheduler()
# 매 정각(00분) 및 30분에 실행 (Cron 방식)
scheduler.add_job(crawl_and_save, 'cron', minute='0,30')

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """애플리케이션 시작 및 종료 시 실행되는 이벤트 핸들러"""
    logger.info("Initializing database...")
    init_db()
    logger.info("Starting scheduler (Running at :00 and :30)...")
    scheduler.start()
    yield
    logger.info("Shutting down scheduler...")
    scheduler.shutdown()

app = FastAPI(title="Machu Picchu Ticket Monitor", lifespan=lifespan)

# --- API Routes ---

@app.get("/api/health")
def health_check():
    """서버 상태 확인 엔드포인트"""
    return {"status": "ok"}

@app.post("/api/crawl/now")
def trigger_crawl():
    """즉시 크롤링을 수행하는 엔드포인트 (수동 트리거)"""
    crawl_and_save()
    return {"message": "Crawl triggered successfully"}

@app.get("/api/availability/current")
def get_current_availability(session: Session = Depends(get_session)):
    """모든 코스별 가장 최신 티켓 가용성 데이터를 조회"""
    circuits = session.exec(select(Circuit)).all()
    results = []
    for circuit in circuits:
        # pylint: disable=no-member
        statement = select(AvailabilityLog).where(
            AvailabilityLog.nidRuta == circuit.nidRuta
        ).order_by(col(AvailabilityLog.timestamp).desc()).limit(1)
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

def get_peru_now():
    """페루 현지 시간 반환"""
    return datetime.utcnow() - timedelta(hours=5)

@app.get("/api/availability/history")
def get_availability_history(
    nid_ruta: Optional[int] = Query(default=None, alias="nidRuta"),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    session: Session = Depends(get_session)
):
    """지정된 날짜 범위 내의 히스토리 데이터를 조회 (시간대 정보 포함)"""
    peru_now = get_peru_now()
    start_dt = datetime.fromisoformat(start_date) if start_date else (peru_now - timedelta(days=7))
    end_dt = datetime.fromisoformat(end_date) if end_date else peru_now

    # pylint: disable=no-member
    statement = select(AvailabilityLog, Circuit.ruta).join(
        Circuit, col(AvailabilityLog.nidRuta) == col(Circuit.nidRuta)
    ).where(
        AvailabilityLog.timestamp >= start_dt,
        AvailabilityLog.timestamp <= end_dt
    ).order_by(col(AvailabilityLog.timestamp).asc())

    if nid_ruta is not None:
        statement = statement.where(AvailabilityLog.nidRuta == nid_ruta)

    results = session.exec(statement).all()

    return [
        {
            **log.model_dump(),
            "route": ruta
        } for log, ruta in results
    ]

# --- Static Files Serving (React Frontend) ---

FRONTEND_DIST = "frontend/dist"

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=f"{FRONTEND_DIST}/assets"), name="assets")

    @app.get("/{rest_of_path:path}")
    async def react_app(rest_of_path: str):
        """React SPA를 서빙하기 위한 Catch-all 핸들러"""
        file_path = os.path.join(FRONTEND_DIST, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(f"{FRONTEND_DIST}/index.html")
else:
    logger.warning(f"{FRONTEND_DIST} not found. Frontend will not be served.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
