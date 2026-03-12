#!/bin/bash

# 마추픽추 티켓 모니터링 시스템 실행 스크립트

print_usage() {
    echo "Usage: ./run.sh [local|docker|build-frontend]"
    echo "  local          : 로컬 환경에서 백엔드 서버 실행 (Python 3.10+ 필요)"
    echo "  docker         : Docker 컨테이너 빌드 및 실행"
    echo "  build-frontend : React 프론트엔드 빌드 (Node.js/npm 필요)"
}

case "$1" in
    "local")
        echo ">>> Installing Python dependencies..."
        python3 -m pip install -r requirements.txt
        python3 -m playwright install chromium
        
        echo ">>> Checking if frontend is built..."
        if [ ! -d "frontend/dist" ]; then
            echo "Warning: frontend/dist not found. Building frontend..."
            cd frontend && npm install && npm run build && cd ..
        fi
        
        echo ">>> Starting FastAPI Backend..."
        export PYTHONPATH=$PYTHONPATH:.
        python3 backend/main.py
        ;;
    
    "docker")
        echo ">>> Building Docker image..."
        docker build -t machupicchu-monitor .
        
        echo ">>> Running Docker container..."
        # 데이터 볼륨 매핑을 위해 /app/data 폴더 생성
        mkdir -p data
        docker run -p 8000:8000 -v $(pwd)/data:/app/data machupicchu-monitor
        ;;
        
    "build-frontend")
        echo ">>> Building React Frontend..."
        cd frontend
        npm install
        npm run build
        cd ..
        echo ">>> Frontend build complete."
        ;;
        
    *)
        print_usage
        exit 1
        ;;
esac
