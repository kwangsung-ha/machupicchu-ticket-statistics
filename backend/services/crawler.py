"""마추픽추 티켓 현황 크롤러 서비스 모듈"""
import time
from datetime import datetime, timedelta

from loguru import logger
from playwright.sync_api import sync_playwright
from sqlmodel import Session, select

from backend.db.session import engine
from backend.models.availability import AvailabilityLog, Circuit

def get_peru_time():
    """페루 현지 시간(UTC-5) 반환"""
    return datetime.utcnow() - timedelta(hours=5)

def crawl_and_save():
    """마추픽추 티켓 현황을 크롤링하고 데이터베이스에 저장 (재시도 로직 포함)"""
    peru_now = get_peru_time()
    logger.info(f"Starting crawl task at {peru_now} (Peru Time)")

    max_retries = 3
    success = False
    target_url = "https://tuboleto.cultura.pe/disponibilidad/llaqta_machupicchu"
    # 바이너리 파일(이미지 등)을 피하고 정확히 JSON API만 낚아채도록 패턴을 구체화
    api_pattern = "**/comunes/disponibilidad-actual*"

    for attempt in range(1, max_retries + 1):
        logger.info(f"--- Attempt {attempt}/{max_retries} ---")
        if _perform_crawl(target_url, api_pattern, attempt):
            success = True
            break
        if attempt < max_retries:
            logger.info("Waiting 30 seconds before next attempt...")
            time.sleep(30)

    if not success:
        logger.error("All crawl attempts failed. The API might be unreachable.")

def _perform_crawl(target_url, api_pattern, attempt):
    """단일 크롤링 시도 수행"""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            logger.info(f"Navigating and waiting for API response matching: {api_pattern}")

            try:
                # URL 패턴이 일치하고 메서드가 POST인 응답만 정확히 기다림 (Preflight/OPTIONS 무시)
                with page.expect_response(
                    lambda response: "comunes/disponibilidad-actual" in response.url and
                                     response.request.method == "POST",
                    timeout=180000
                ) as response_info:
                    page.goto(target_url, wait_until="domcontentloaded", timeout=180000)
                    response = response_info.value
                    if response.status == 200:
                        data = response.json()
                        if isinstance(data, list) and len(data) > 0:
                            logger.success(f"Successfully captured API data on attempt {attempt}!")
                            save_to_db(data)
                            return True
            except Exception as e: # pylint: disable=broad-exception-caught
                logger.warning(f"Attempt {attempt} failed: {str(e)[:100]}...")
            finally:
                browser.close()
    except Exception as e: # pylint: disable=broad-exception-caught
        logger.error(f"Critical error on attempt {attempt}: {e}")
    return False

def save_to_db(data_list):
    """크롤링된 데이터를 DB 모델로 변환하여 저장"""
    peru_now = get_peru_time()
    saved_count = 0

    with Session(engine) as session:
        for item in data_list:
            try:
                if "nidRuta" not in item:
                    continue
                _process_item(session, item, peru_now)
                saved_count += 1
            except Exception as e: # pylint: disable=broad-exception-caught
                logger.error(f"Error saving record: {e}")
        session.commit()
    logger.info(f"Saved {saved_count} records to database.")
    return saved_count

def _process_item(session, item, timestamp):
    """개별 티켓 항목 처리 및 저장"""
    statement = select(Circuit).where(Circuit.nidRuta == item["nidRuta"])
    circuit = session.exec(statement).first()

    if not circuit:
        circuit = Circuit(
            nidLugar=item.get("nidLugar", 1),
            nidCircuito=item.get("nidCircuito", 0),
            nidRuta=item["nidRuta"],
            circuito=item.get("circuito", "Unknown"),
            ruta=item.get("ruta", "Unknown")
        )
        session.add(circuit)

    log = AvailabilityLog(
        nidRuta=item["nidRuta"],
        total=item.get("ncupo", 0),
        available=item.get("ncupoActual", 0),
        booked=item.get("ncupo", 0) - item.get("ncupoActual", 0),
        timestamp=timestamp
    )
    session.add(log)
