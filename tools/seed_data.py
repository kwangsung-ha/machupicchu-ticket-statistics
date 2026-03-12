import os
import random
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, create_engine
from backend.models.availability import Circuit, AvailabilityLog

# 데이터 폴더 내 DB 파일 경로
DATABASE_URL = "sqlite:///./data/machupicchu.db"
engine = create_engine(DATABASE_URL)

def get_peru_now():
    # UTC 기준에서 5시간을 빼서 페루 현지 시간 계산
    return datetime.utcnow() - timedelta(hours=5)

def seed():
    # 테이블 생성
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # 1. 기초 회로/경로 데이터
        circuits_data = [
            {"nidLugar": 1, "nidCircuito": 1, "nidRuta": 7, "circuito": "Circuito 1 - Panorámico", "ruta": "Ruta 1-A: Montaña Machupicchu", "total": 50},
            {"nidLugar": 1, "nidCircuito": 1, "nidRuta": 8, "circuito": "Circuito 1 - Panorámico", "ruta": "Ruta 1-B: Terraza superior", "total": 100},
            {"nidLugar": 1, "nidCircuito": 2, "nidRuta": 11, "circuito": "Circuito 2 - Circuito clásico", "ruta": "Ruta 2-A: Clásico Diseñada", "total": 600},
            {"nidLugar": 1, "nidCircuito": 2, "nidRuta": 12, "circuito": "Circuito 2 - Circuito clásico", "ruta": "Ruta 2-B: Terraza Inferior", "total": 100},
            {"nidLugar": 1, "nidCircuito": 3, "nidRuta": 13, "circuito": "Circuito 3 - Machupicchu realeza", "ruta": "Ruta 3-A: Montaña Waynapicchu", "total": 50},
            {"nidLugar": 1, "nidCircuito": 3, "nidRuta": 14, "circuito": "Circuito 3 - Machupicchu realeza", "ruta": "Ruta 3-B: Realeza diseñada", "total": 100},
        ]
        
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
        print("Circuits verified.")

        # 2. 지난 3년간의 더미 로그 데이터 생성 (약 1095일)
        peru_now = get_peru_now()
        days_to_seed = 3 * 365
        print(f"Seeding logs for {days_to_seed} days (4-hour intervals) in PERU TIME (UTC-5)...")

        for d in range(days_to_seed):
            for h in range(0, 24, 4): # 0, 4, 8, 12, 16, 20시 (페루 현지 시간 기준)
                log_time = peru_now - timedelta(days=d, hours=h)
                
                # 성수기 반영 (6, 7, 8월은 예약률 대폭 상승)
                month = log_time.month
                is_peak_season = month in [6, 7, 8]
                
                for c in circuits_data:
                    total = c["total"]
                    
                    if is_peak_season:
                        random_factor = random.uniform(0.8, 1.0)
                    else:
                        random_factor = random.uniform(0.3, 0.7)
                    
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
            
            if d % 50 == 0:
                print(f"Progress: {d}/{days_to_seed} days seeded...")
                session.commit()
        
        session.commit()
        print(f"Successfully seeded 3 years of data in Peru Local Time!")

if __name__ == "__main__":
    seed()
