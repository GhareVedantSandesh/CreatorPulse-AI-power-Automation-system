@echo off
echo Installing dependencies for V1 Architecture...

:: 1. Render Service
echo [1/3] Installing Render Service dependencies...
cd render-service && npm install && cd ..

:: 2. AI Service
echo [2/3] Installing AI Service dependencies (in venv)...
cd ai-service && .\venv\Scripts\python.exe -m pip install -r requirements.txt && cd ..

:: 3. Backend/Frontend Workspace
echo [3/3] Installing workspace dependencies (pnpm)...
npx pnpm install

echo.
echo ======================================================
echo  Dependencies installed successfully!
echo ======================================================
echo.
pause
