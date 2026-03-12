# Stage 1: Build React Frontend
FROM node:18-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Backend Runtime
FROM python:3.10-slim
WORKDIR /app

# Playwright 의존성 및 브라우저 설치를 위한 시스템 라이브러리 추가
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    librandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# 백엔드 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright 브라우저 설치 (Chromium만)
RUN playwright install chromium

# 빌드된 프론트엔드 복사
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 백엔드 소스 복사
COPY backend/ ./backend/

# 환경 변수 설정
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# SQLite DB 저장을 위한 볼륨 설정
VOLUME ["/app/data"]
ENV DATABASE_URL=sqlite:////app/data/machupicchu.db

# 포트 개방
EXPOSE 8000

# 서버 실행
CMD ["python", "backend/main.py"]
