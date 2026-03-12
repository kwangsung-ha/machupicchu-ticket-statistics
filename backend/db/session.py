"""데이터베이스 세션 및 엔진 설정 모듈"""
import os
from sqlmodel import create_engine, Session

# SQLite 데이터베이스 파일 경로
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/machupicchu.db")

engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    """데이터베이스 테이블 초기화"""
    from backend.models.availability import SQLModel # pylint: disable=import-outside-toplevel
    SQLModel.metadata.create_all(engine)

def get_session():
    """DB 세션 생성기"""
    with Session(engine) as session:
        yield session
