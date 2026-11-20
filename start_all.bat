@echo off
echo Starting Creator Pulse V1 Architecture (Multi-Service)...

:: 1. AI Service (API)
echo [1/5] Starting AI API Service...
start "AI API" cmd /c "cd ai-service && .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000"

:: 2. AI Worker (Pipeline)
echo [2/5] Starting AI Pipeline Worker...
start "AI Worker" cmd /c "cd ai-service && set PYTHONPATH=. && .\venv\Scripts\python.exe app/worker.py"

:: 3. Render Service (Puppeteer)
echo [3/5] Starting Render Microservice...
start "Render Service" cmd /c "cd render-service && npm run dev"

:: 4. API Server (Backend)
echo [4/5] Starting Backend API Server...
start "Backend Server" cmd /c "cd artifacts/api-server && npm run dev"

:: 5. Frontend (React)
echo [5/5] Starting React Frontend...
start "Frontend UI" cmd /c "cd artifacts/creatorpulse && npx vite --force"

echo.
echo ======================================================
echo  CreatorPulse V1 (Local Postgres + Redis)
echo ======================================================
echo  - Frontend:  http://localhost:5173
echo  - Backend:   http://localhost:5000
echo  - AI API:    http://localhost:8000
echo  - Render:    http://localhost:3001
echo  - Storage:   Serving from /storage
echo  - Database:  Local Postgres (drizzle)
echo  - Redis:     Ensure Redis is running on localhost:6379
echo ======================================================
echo.
pause
