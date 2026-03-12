# PRD: 마추픽추 티켓 현황 모니터링 시스템 (Machu Picchu Ticket Monitoring System)

## 1. 개요 (Overview)
본 프로젝트는 페루 문화부의 마추픽추 입장권 예매 사이트(TuBoleto)의 잔여 티켓 현황을 주기적으로 수집하고, 이를 시각화하여 사용자에게 통계 정보를 제공하는 서비스이다.

## 2. 목표 (Goals)
- 마추픽추 각 코스(Llaqta Machu Picchu)별 티켓 가용성을 실시간에 가깝게 추적.
- 수집된 데이터를 바탕으로 티켓 매진 패턴 및 선호도 분석 가능.
- 사용자가 직관적으로 오늘 및 과거 통계를 확인할 수 있는 웹 인터페이스 제공.

## 3. 핵심 기능 (Key Features)

### 3.1. 데이터 크롤러 (Crawler)
- **대상**: https://tuboleto.cultura.pe/disponibilidad/llaqta_machupicchu
- **주기**: 30분 단위 (Crontab 또는 스케줄러 라이브러리 활용)
- **수집 데이터**:
  - 코스명 (Circuit Name)
  - 관람 시간대 (Time Slot)
  - 총 티켓 수 (Total)
  - 예매된 티켓 수 (Booked)
  - 잔여 티켓 수 (Available)
  - 수집 일시 (Timestamp)

### 3.2. 데이터베이스 (Database)
- **초기 단계**: 로컬 SQLite 사용.
- **확장성**: 향후 Remote PostgreSQL로 쉽게 전환할 수 있도록 ORM(SQLAlchemy, Prisma 등) 활용.
- **스키마**:
  - `circuits`: 코스 정보
  - `availability_logs`: 시간별 수집된 가용성 데이터

### 3.3. 웹 대시보드 (Web Dashboard)
- **오늘의 현황**: 실시간에 가까운(최근 수집 데이터) 각 코스별 잔여 티켓 현황 시각화.
- **통계 조회**: 최근 N개월 간의 일별/시간별 티켓 소진 추이 그래프 제공.
- **필터링**: 코스별, 날짜별 데이터 필터링 기능.

## 4. 기술 스택 (Technical Stack)
- **Crawler & Backend**: Python 3.10+ (FastAPI)
- **Scheduler**: FastAPI 내장 스케줄러 (APScheduler 활용)
- **Database**: SQLite (SQLAlchemy 또는 SQLModel 활용하여 PostgreSQL 전환 용이성 확보)
- **Frontend**: React (FastAPI에서 정적 파일로 서빙)
- **Deployment**: Single Dockerfile (Oracle Cloud VM 배포 타겟)

## 5. 로드맵 (Roadmap)
1. **Phase 1**: FastAPI 기반 스켈레톤 구축 및 APScheduler 연동.
2. **Phase 2**: 크롤링 엔진(Playwright/httpx) 개발 및 SQLite 저장 로직 구현.
3. **Phase 3**: 웹 대시보드(React) 개발 및 FastAPI 정적 서빙 연동.
4. **Phase 4**: Dockerize 및 Oracle VM 배포 테스트.

## 6. 제약 및 고려 사항
- 사이트의 구조 변경에 유연하게 대응할 수 있는 셀렉터 설계.
- 사이트 차단 방지를 위한 User-Agent 설정 및 적절한 요청 간격 유지.
- 다국어 지원 (스페인어 원문 데이터 처리).
