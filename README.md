🏔️ **마추픽추 티켓 현황 모니터링 시스템**

이 프로젝트는 페루 문화부 사이트의 마추픽추 입장권 잔여량을 실시간으로 수집하고, 여행자들에게 유용한 통계 정보를 제공하는 대시보드 서비스입니다.

---

## ✨ 주요 기능

*   **정밀 크롤링**: Playwright를 활용해 페루 문화부 API의 실제 응답 데이터를 가로채어 정확한 잔여량을 수집합니다.
*   **30분 단위 수집**: 매 정각과 30분마다 자동으로 최신 데이터를 갱신합니다.
*   **현지 시간 기반**: 모든 데이터는 **페루 현지 시각(UTC-5)** 기준으로 처리되어 직관적인 분석이 가능합니다.
*   **인터랙티브 대시보드**: 
    *   현재 실시간 티켓 현황 테이블 (잔여량에 따른 색상 표시).
    *   최근 6개월간의 시간대별 상세 가용성 추이 그래프 제공.
    *   원하는 시작/종료 월을 선택하여 과거 데이터 자유롭게 조회.

---

## 🛠 기술 스택

- **Backend**: Python (FastAPI, SQLModel, SQLite)
- **Crawler**: Playwright (API Interceptor 방식)
- **Frontend**: React (Vite, Tailwind CSS, Recharts)
- **Infra**: Docker 지원 (Oracle VM 등 클라우드 배포 최적화)

---

## 🚀 시작하기

### 1. 사전 준비
- Python 3.10 이상, Node.js 18 이상
- [Poetry](https://python-poetry.org/docs/#installation) 설치

### 2. 프로젝트 설정 및 실행
```bash
# 1. 의존성 설치 및 브라우저 준비
poetry install
poetry run playwright install chromium
poetry run playwright install-deps chromium  # (Linux 환경인 경우 필수)

# 2. 실행 (프론트 빌드 + 백엔드 실행 한 번에)
chmod +x run.sh
./run.sh local
```
이제 [http://localhost:8000](http://localhost:8000)에서 대시보드를 확인하세요!

### 3. 테스트 데이터 생성 (선택 사항)
즉시 그래프를 확인하고 싶다면 지난 3년치 더미 데이터를 생성할 수 있습니다.
```bash
poetry run python tools/seed_data.py
```

---

## 🐳 Docker 배포 (추천)

클라우드 서버에서 가장 빠르고 간편하게 실행하는 방법입니다.

```bash
# 이미지 빌드
docker build -t machupicchu-monitor .

# 백그라운드 실행 (데이터 유지를 위해 ./data 폴더 연결)
mkdir -p data
docker run -d --name m-monitor -p 8000:8000 -v $(pwd)/data:/app/data --restart always machupicchu-monitor
```

---

## 📝 프로젝트 구조

```text
machupicchu/
├── backend/            # FastAPI 서버 및 크롤러 엔진
├── frontend/           # React 대시보드 웹 소스
├── data/               # SQLite 데이터베이스 저장소
├── tools/              # 더미 데이터 생성 도구
├── Dockerfile          # 배포용 설정
└── run.sh              # 통합 실행 스크립트
```

즐거운 마추픽추 여행 되세요! ✈️🗿
