from sqlmodel import SQLModel, create_engine, Session
import os

# SQLite 데이터베이스 파일 경로
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/machupicchu.db")

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    from backend.models.availability import SQLModel
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
