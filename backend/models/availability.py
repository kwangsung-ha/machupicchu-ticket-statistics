from sqlmodel import SQLModel, Field, create_engine, Session, select
from datetime import datetime
from typing import Optional, List

class Circuit(SQLModel, table=True):
    """코스(Circuito) 및 상세 경로(Ruta) 정보"""
    id: Optional[int] = Field(default=None, primary_key=True)
    nidLugar: int
    nidCircuito: int
    nidRuta: int = Field(unique=True) # 중복 방지를 위해 unique 설정
    circuito: str
    ruta: str

class AvailabilityLog(SQLModel, table=True):
    """시간별 티켓 가용성 로그"""
    id: Optional[int] = Field(default=None, primary_key=True)
    nidRuta: int = Field(foreign_key="circuit.nidRuta")
    total: int # ncupo
    booked: int # total - ncupoActual
    available: int # ncupoActual
    timestamp: datetime = Field(default_factory=datetime.utcnow)
