# Run-all helper: stop ports, start backend/frontend, run API tests, push
$ErrorActionPreference = 'Stop'
Write-Output "=== run_all.ps1 starting ==="

Write-Output "Stopping listeners on ports 3000 and 5000 (if any)"
$ports = @(3000,5000)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $pid = $c.OwningProcess
        Write-Output "Stopping process with PID $pid on port $p"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 1

# Start backend and frontend using concurrently
Write-Output "Starting backend and frontend via 'npm start'"
Push-Location "C:\Users\w\Academix"
$mainProc = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru
Write-Output "Launched main process (PID $($mainProc.Id))"

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
if (-not $up) { Write-Output "Backend did not respond on port 5000"; exit 1 }
Write-Output "Backend is responding on port 5000"

# wait for frontend
$frontendUp = $false
for ($i=0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) {
            $frontendUp = $true
            break
        }
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

# Stage, commit, and push changes to GitHub
Push-Location "C:\Users\w\Academix"

$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Output "Changes detected. Staging and committing..."
    git add .
    $commitMessage = "Automated commit by run_all.ps1 on $(Get-Date)"
    git commit -m $commitMessage
} else {
    Write-Output "No local changes to commit."
}

Write-Output "Attempting to push to origin main..."
try {
    $pushOutput = git push origin main 2>&1
    Write-Output $pushOutput
} catch {
    Write-Output ("git push failed: {0}" -f $_)
    exit 1
}
Pop-Location

Write-Output "=== run_all.ps1 finished ==="
