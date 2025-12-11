# Run-all helper: stop ports, start backend/frontend, run API tests, push
$ErrorActionPreference = 'Stop'
Write-Output "=== run_all.ps1 starting ==="

Write-Output "Stopping listeners on ports 3000 and 5000 (if any)"
$ports = @(3000,5000)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            $pid = $c.OwningProcess
            if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Output "Stopped PID $pid listening on port $p"
                } catch {
                    Write-Output ("Failed to stop PID {0}: {1}" -f $pid, $_)
                }
            }
        }
    }
}

Start-Sleep -Seconds 1

# Start backend on port 5000
Write-Output "Starting backend on port 5000"
Push-Location "C:\Users\w\Academix\backend"
Remove-Item Env:DB_USER -ErrorAction SilentlyContinue
Remove-Item Env:DB_NAME -ErrorAction SilentlyContinue
Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
$env:PORT = '5000'
$backendProc = Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory (Get-Location) -PassThru
Write-Output "Backend launched (PID $($backendProc.Id))"

# wait for backend to respond
$up=false
for ($i=0; $i -lt 20; $i++) {
    try {
        $r = Invoke-RestMethod -Uri http://localhost:5000 -Method GET -TimeoutSec 2
        if ($r -and $r.message) { $up = $true; break }
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $up) { Write-Output "Backend did not respond on port 5000"; Pop-Location; exit 1 }
Write-Output "Backend is responding on port 5000"

Pop-Location

# Start frontend on port 3000
Write-Output "Starting frontend on port 3000"
Push-Location "C:\Users\w\Academix\frontend"
# Use cmd to set PORT then run npm start in new window (detached)
$cmd = "set PORT=3000 && npm start"
$frontendProc = Start-Process -FilePath cmd -ArgumentList '/c', $cmd -WorkingDirectory (Get-Location) -PassThru
Write-Output "Frontend launcher started (PID $($frontendProc.Id))"

# wait for frontend
$frontendUp = $false
for ($i=0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) { $frontendUp = $true; break }
    } catch {
        Start-Sleep -Seconds 1
    }
}
if ($frontendUp) { Write-Output "Frontend is responding on port 3000" } else { Write-Output "Frontend did not respond on port 3000 (it may have started on a different port)" }

Pop-Location

# Run API tests
Write-Output "Running API tests against http://localhost:5000"
try {
    $classes = Invoke-RestMethod -Uri http://localhost:5000/classes -Method GET -TimeoutSec 5
    Write-Output "GET /classes OK"
} catch {
    Write-Output ("GET /classes failed: {0}" -f $_)
    exit 1
}

$createBody = @{ course_code='AUTORUN101'; course_name='Auto Run Course'; lecturer_id=$null; day_of_week=1; start_time='09:00:00'; end_time='10:00:00' } | ConvertTo-Json
try {
    $createResp = Invoke-RestMethod -Uri http://localhost:5000/classes -Method POST -Body $createBody -ContentType 'application/json' -TimeoutSec 5
    Write-Output "POST /classes OK: classId=$($createResp.classId)"
} catch {
    Write-Output ("POST /classes failed: {0}" -f $_)
    exit 1
}

$classId = $createResp.classId
$sessionBody = @{ session_date = (Get-Date -Format yyyy-MM-dd); qr_signature = 'sig-run-001'; qr_expires_at = (Get-Date).AddMinutes(30).ToString('yyyy-MM-dd HH:mm:ss') } | ConvertTo-Json
try {
    $sessionResp = Invoke-RestMethod -Uri "http://localhost:5000/classes/$classId/sessions" -Method POST -Body $sessionBody -ContentType 'application/json' -TimeoutSec 5
    Write-Output "POST /classes/$classId/sessions OK: sessionId=$($sessionResp.sessionId)"
} catch {
    Write-Output ("POST session failed: {0}" -f $_)
    exit 1
}

$sessionId = $sessionResp.sessionId
$scanBody = @{ studentId = 1; qr_signature = 'sig-run-001'; latitude = 0.0; longitude = 0.0; browser_fingerprint = 'auto-agent' } | ConvertTo-Json
try {
    $scanResp = Invoke-RestMethod -Uri "http://localhost:5000/classes/$classId/sessions/$sessionId/scan" -Method POST -Body $scanBody -ContentType 'application/json' -TimeoutSec 5
    Write-Output "POST /scan OK: attendanceId=$($scanResp.attendanceId)"
} catch {
    Write-Output ("POST scan failed: {0}" -f $_)
    exit 1
}

Write-Output "API tests completed successfully"

# Attempt to push to GitHub
Push-Location "C:\Users\w\Academix"
Write-Output "Attempting git push origin main"
try {
    $pushOutput = git push origin main 2>&1
    Write-Output $pushOutput
} catch {
    Write-Output ("git push failed: {0}" -f $_)
}
Pop-Location

Write-Output "=== run_all.ps1 finished ==="
