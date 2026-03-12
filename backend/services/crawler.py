from playwright.sync_api import sync_playwright
import json
from datetime import datetime
from sqlmodel import Session, select
from backend.models.availability import Circuit, AvailabilityLog
from backend.db.session import engine
import time

def crawl_and_save():
    """마추픽추 티켓 현황을 크롤링하고 데이터베이스에 저장"""
    print(f"[{datetime.now()}] Starting crawl task...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.set_default_timeout(120000)

        availability_data = []

        def handle_response(response):
            if "disponibilidad-actual" in response.url and response.status == 200:
                try:
                    availability_data.append(response.json())
                except:
                    pass

        page.on("response", handle_response)
        
        try:
            page.goto("https://tuboleto.cultura.pe/disponibilidad/llaqta_machupicchu", wait_until="domcontentloaded")
            # 데이터 로드 대기 (최대 30초)
            time.sleep(15) 
            
            if not availability_data:
                print("No availability data captured. Retrying once...")
                page.reload()
                time.sleep(15)

            if availability_data:
                # 가장 최근의 응답 데이터 사용
                latest_data = availability_data[-1]
                save_to_db(latest_data)
                print(f"Successfully saved {len(latest_data)} routes to database.")
            else:
                print("Failed to capture availability data.")

        except Exception as e:
            print(f"Error during scheduled crawl: {e}")
        finally:
            browser.close()

def save_to_db(data_list):
    """크롤링된 데이터를 DB 모델로 변환하여 저장"""
    with Session(engine) as session:
        for item in data_list:
            # 1. 코스(Circuit) 정보 업데이트 또는 생성
            statement = select(Circuit).where(Circuit.nidRuta == item["nidRuta"])
            circuit = session.exec(statement).first()
            
            if not circuit:
                circuit = Circuit(
                    nidLugar=item["nidLugar"],
                    nidCircuito=item["nidCircuito"],
                    nidRuta=item["nidRuta"],
                    circuito=item["circuito"],
                    ruta=item["ruta"]
                )
                session.add(circuit)
            
            # 2. 가용성 로그(AvailabilityLog) 기록
            log = AvailabilityLog(
                nidRuta=item["nidRuta"],
                total=item["ncupo"],
                available=item["ncupoActual"],
                booked=item["ncupo"] - item["ncupoActual"],
                timestamp=datetime.utcnow()
            )
            session.add(log)
        
        session.commit()
