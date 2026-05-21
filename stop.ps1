# Stop all Career Negotiation Simulator processes
# Usage: .\stop.ps1

Write-Host "Stopping services..." -ForegroundColor Yellow

$killed = 0

# Kill uvicorn processes in the bidding-game directory
Get-Process -Name python -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        if ($cmd -match "uvicorn.*api\.main:app") {
            Stop-Process -Id $_.Id -Force
            Write-Host "  Killed uvicorn (PID $($_.Id))" -ForegroundColor Green
            $killed++
        }
    } catch {}
}

# Kill Next.js dev server processes
Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
        if ($cmd -match "next.*dev") {
            Stop-Process -Id $_.Id -Force
            Write-Host "  Killed next dev (PID $($_.Id))" -ForegroundColor Green
            $killed++
        }
    } catch {}
}

if ($killed -eq 0) {
    Write-Host "  No running services found." -ForegroundColor Gray
} else {
    Write-Host "  Stopped $killed service(s)." -ForegroundColor Green
}
