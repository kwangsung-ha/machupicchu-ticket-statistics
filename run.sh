#!/bin/bash

# 마추픽추 티켓 모니터링 시스템 실행 스크립트

print_usage() {
    echo "Usage: ./run.sh [local|docker]"
    echo "  local  : 프론트엔드 빌드 후 로컬 백엔드 서버 실행 (Python 3.10+, Node.js 필요)"
    echo "  docker : Docker 컨테이너 빌드 및 실행 (추천)"
}

case "$1" in
    "local")
        echo ">>> Installing Python dependencies..."
        python3 -m pip install -r requirements.txt
        python3 -m playwright install chromium
        
        echo ">>> Building React Frontend..."
        if [ -d "frontend" ]; then
            cd frontend && npm install && npm run build && cd ..
        else
            echo "Error: frontend directory not found."
            exit 1
        fi
        
        echo ">>> Starting FastAPI Backend..."
        export PYTHONPATH=$PYTHONPATH:.
        export DATABASE_URL=sqlite:///./data/machupicchu.db
        mkdir -p data
        python3 backend/main.py
        ;;
    
    "docker")
        echo ">>> Building and Running via Docker..."
        # 데이터 볼륨 매핑을 위해 data 폴더 생성
        mkdir -p data
        docker build -t machupicchu-monitor .
        docker run -p 8000:8000 -v $(pwd)/data:/app/data machupicchu-monitor
        ;;
        
    *)
        print_usage
        exit 1
        ;;
esac
