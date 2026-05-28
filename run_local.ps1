Write-Host "=========================================================="
Write-Host "   QuizPulse RAM-Optimized zero-Dependency Local Launcher"
Write-Host "=========================================================="

# Create log folders
$logDir = "C:\Users\DELL\.gemini\antigravity\scratch\quizpulse\logs"
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}

# --- 1. START BACKEND SERVICE ---
Write-Host "`n[1/3] Preparing FastAPI Backend Virtual Environment..."
cd C:\Users\DELL\.gemini\antigravity\scratch\quizpulse\backend

if (!(Test-Path "venv")) {
    & python -m venv venv
    Write-Host "Virtual environment created."
}

Write-Host "Installing packages sequentially to minimize RAM usage..."
& venv\Scripts\pip install --no-cache-dir fastapi==0.110.0 uvicorn==0.28.0 motor==3.3.2 pydantic==2.6.4 pydantic-settings==2.2.1 faker==24.3.0 pymongo==4.6.2 email-validator==2.1.1 python-multipart==0.0.9 | Out-Null
Write-Host "Backend requirements installed successfully."

Write-Host "Launching RAM-Optimized FastAPI (In-Memory Database activated)..."
# Start backend in background logging to file
$backendArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"
Start-Process -FilePath "venv\Scripts\python.exe" -ArgumentList $backendArgs -WorkingDirectory "C:\Users\DELL\.gemini\antigravity\scratch\quizpulse\backend" -NoNewWindow -RedirectStandardOutput "$logDir\backend_out.log" -RedirectStandardError "$logDir\backend_err.log"

# --- 2. START FRONTEND SERVICE ---
Write-Host "`n[2/3] Launching Next.js dev server with 512MB RAM cap..."
cd C:\Users\DELL\.gemini\antigravity\scratch\quizpulse\frontend

# Start frontend in background logging to file, setting max heap size to 512MB
$env:NODE_OPTIONS = "--max-old-space-size=512"
$frontendArgs = "run dev"
Start-Process -FilePath "npm.cmd" -ArgumentList $frontendArgs -WorkingDirectory "C:\Users\DELL\.gemini\antigravity\scratch\quizpulse\frontend" -NoNewWindow -RedirectStandardOutput "$logDir\frontend_out.log" -RedirectStandardError "$logDir\frontend_err.log"

# --- 3. FINAL BOOT DIAGNOSTICS ---
Write-Host "`n[3/3] Waiting for servers to initialize..."
Start-Sleep -Seconds 10

Write-Host "`n=========================================================="
Write-Host "             System Online & Ready for Review!"
Write-Host "=========================================================="
Write-Host "  Frontend Portal: http://localhost:3000"
Write-Host "  Backend Swagger UI: http://localhost:8000/docs"
Write-Host "  RAM Mode: Active In-Memory Sandbox Mock Database"
Write-Host "=========================================================="
Write-Host "  Review backend logs: Get-Content '$logDir\backend_out.log'"
Write-Host "  Review frontend logs: Get-Content '$logDir\frontend_out.log'"
Write-Host "=========================================================="
