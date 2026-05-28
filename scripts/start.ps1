# Career Negotiation Simulator — One-click startup
# Usage: .\start.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backendCmd = "cd `"$root`"; python -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload"
$frontendCmd = "cd `"$root\frontend`"; npm run dev"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Career Negotiation Simulator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/3] Checking Python..." -ForegroundColor Gray
$pyVersion = python --version 2>$null
if (-not $pyVersion) {
    Write-Host "ERROR: Python not found in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "      $pyVersion" -ForegroundColor Green

# Check Node
Write-Host "[2/3] Checking Node.js..." -ForegroundColor Gray
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js not found in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "      Node $nodeVersion" -ForegroundColor Green

# Start backend
Write-Host "[3/3] Starting services..." -ForegroundColor Gray
Write-Host ""

Write-Host "  Backend  -> http://localhost:8001" -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit","-Command",$backendCmd -PassThru

Start-Sleep -Seconds 2

Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Cyan
$frontend = Start-Process cmd.exe -ArgumentList '/c',"npm run dev" -WorkingDirectory "$root\frontend" -PassThru

$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
    $backendReady = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
    $frontendReady = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($backendReady -and $frontendReady) {
        break
    }
    Start-Sleep -Seconds 1
}

if (-not (Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue) -or -not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Services failed to start within 30 seconds." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Both services starting..." -ForegroundColor Cyan
Write-Host "  Close this window to keep them running" -ForegroundColor Yellow
Write-Host "  Or press Ctrl+C then run: .\stop.ps1" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Keep this window alive
try {
    while ($true) {
        Start-Sleep -Seconds 5
        $backendRunning = Get-Process -Id $backend.Id -ErrorAction SilentlyContinue
        $frontendRunning = Get-Process -Id $frontend.Id -ErrorAction SilentlyContinue
        if (-not $backendRunning -and -not $frontendRunning) {
            Write-Host "Both services have stopped." -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "Exiting..." -ForegroundColor Gray
}
