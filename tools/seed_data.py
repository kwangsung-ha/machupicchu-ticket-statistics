import os
import random
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, create_engine
from backend.models.availability import Circuit, AvailabilityLog

# 데이터 폴더 내 DB 파일 경로
DATABASE_URL = "sqlite:///./data/machupicchu.db"
engine = create_engine(DATABASE_URL)

def seed():
    # 테이블 생성
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. 기초 회로/경로 데이터 (기존 데이터가 없는 경우에만)
        circuits_data = [
            {"nidLugar": 1, "nidCircuito": 1, "nidRuta": 7, "circuito": "Circuito 1 - Panorámico", "ruta": "Ruta 1-A: Montaña Machupicchu", "total": 50},
            {"nidLugar": 1, "nidCircuito": 1, "nidRuta": 8, "circuito": "Circuito 1 - Panorámico", "ruta": "Ruta 1-B: Terraza superior", "total": 100},
            {"nidLugar": 1, "nidCircuito": 2, "nidRuta": 11, "circuito": "Circuito 2 - Circuito clásico", "ruta": "Ruta 2-A: Clásico Diseñada", "total": 600},
            {"nidLugar": 1, "nidCircuito": 2, "nidRuta": 12, "circuito": "Circuito 2 - Circuito clásico", "ruta": "Ruta 2-B: Terraza Inferior", "total": 100},
            {"nidLugar": 1, "nidCircuito": 3, "nidRuta": 13, "circuito": "Circuito 3 - Machupicchu realeza", "ruta": "Ruta 3-A: Montaña Waynapicchu", "total": 50},
            {"nidLugar": 1, "nidCircuito": 3, "nidRuta": 14, "circuito": "Circuito 3 - Machupicchu realeza", "ruta": "Ruta 3-B: Realeza diseñada", "total": 100},
        ]
        
        # 회로 정보 추가
        for c in circuits_data:
            existing = session.query(Circuit).filter(Circuit.nidRuta == c["nidRuta"]).first()
            if not existing:
                circuit = Circuit(
                    nidLugar=c["nidLugar"],
                    nidCircuito=c["nidCircuito"],
                    nidRuta=c["nidRuta"],
                    circuito=c["circuito"],
                    ruta=c["ruta"]
                )
                session.add(circuit)
        
        session.commit()
        print("Circuits seeded.")

        # 2. 지난 30일간의 더미 로그 데이터 생성
        now = datetime.utcnow()
        for i in range(30 * 24): # 30일 * 24시간
            log_time = now - timedelta(hours=i)
            
            for c in circuits_data:
                total = c["total"]
                # 시간에 따라 무작위로 예약 수(booked) 결정 (0 ~ total 사이)
                # 최근 데이터일수록 예약이 더 많이 찬 것처럼 시뮬레이션
                random_factor = random.uniform(0.1, 0.9)
                booked = int(total * random_factor)
                available = total - booked
                
                log = AvailabilityLog(
                    nidRuta=c["nidRuta"],
                    total=total,
                    booked=booked,
                    available=available,
                    timestamp=log_time
                )
                session.add(log)
            
            # 성능을 위해 100개 단위로 커밋
            if i % 100 == 0:
                session.commit()
        
        session.commit()
        print("Availability logs seeded (30 days of data).")

if __name__ == "__main__":
    seed()
