# Run-all helper: stop ports, start backend/frontend, run API tests, push
$ErrorActionPreference = 'Stop'
Write-Output "=== run_all.ps1 starting ==="
$mainProc = $null

# Define script parameters, including an optional commit message
param(
    [string]$CommitMessage = "Automated commit by run_all.ps1 on $(Get-Date)"
)

# Helper function for running API tests to reduce duplication
function Run-ApiTest {
    param(
        [string]$Name,
        [string]$Uri,
        [string]$Method,
        [object]$Body
    )
    Write-Output "TEST: $Name"
    $params = @{ Uri = $Uri; Method = $Method; TimeoutSec = 5 }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json)
        $params.ContentType = 'application/json'
    }
    try {
        $response = Invoke-RestMethod @params
        Write-Output "PASS: $Name"
        return $response
    } catch {
        Write-Error "FAIL: $Name. Details: $_"
        throw "API Test '$Name' failed."
    }
}

try {
    # --- 1. Cleanup and Preparation ---
    Write-Output "Stopping listeners on ports 3000 and 5000 (if any)"
    @(3000,5000) | ForEach-Object {
        $conns = Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue
        $conns | ForEach-Object {
            Write-Output "Stopping process with PID $($_.OwningProcess) on port $_"
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1

    # --- 2. Start Services ---
    Write-Output "Starting backend and frontend via 'npm start' in a new window"
    Push-Location "C:\Users\w\Academix"
    $mainProc = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -WindowStyle Minimized
    Write-Output "Launched main process (PID $($mainProc.Id))"

    # --- 3. Health Checks ---
    Write-Output "Waiting for backend to respond on port 5000..."
    1..20 | ForEach-Object {
        try {
            $r = Invoke-RestMethod -Uri http://localhost:5000 -Method GET -TimeoutSec 2
            if ($r -and $r.message) { Write-Output "Backend is responding."; return }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "Backend did not respond on port 5000."

    Write-Output "Waiting for frontend to respond on port 3000..."
    1..30 | ForEach-Object {
        try {
            $resp = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 2
            if ($resp.StatusCode -eq 200) { Write-Output "Frontend is responding."; return }
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    Write-Warning "Frontend did not respond on port 3000. It may have started on another port."

    # --- 4. Run API Integration Tests ---
    Write-Output "Running API integration tests..."
    $classId = $null
    try {
        Run-ApiTest -Name "GET /classes" -Uri "http://localhost:5000/classes" -Method GET

        $createBody = @{ course_code='AUTORUN101'; course_name='Auto Run Course'; lecturer_id=$null; day_of_week='Monday'; start_time='09:00:00'; end_time='10:00:00' }
        $createResp = Run-ApiTest -Name "POST /classes" -Uri "http://localhost:5000/classes" -Method POST -Body $createBody
        $classId = $createResp.classId

        $sessionBody = @{ session_date = (Get-Date -Format yyyy-MM-dd); qr_signature = 'sig-run-001'; qr_expires_at = (Get-Date).AddMinutes(30).ToString('yyyy-MM-dd HH:mm:ss') }
        $sessionResp = Run-ApiTest -Name "POST /sessions" -Uri "http://localhost:5000/classes/$classId/sessions" -Method POST -Body $sessionBody
        $sessionId = $sessionResp.sessionId

        $scanBody = @{ studentId = 1; qr_signature = 'sig-run-001'; latitude = 0.0; longitude = 0.0; browser_fingerprint = 'auto-agent' }
        Run-ApiTest -Name "POST /scan" -Uri "http://localhost:5000/classes/$classId/sessions/$sessionId/scan" -Method POST -Body $scanBody

        Write-Output "All API tests completed successfully."
    }
    finally {
        # This block ensures test data is cleaned up even if a test fails
        if ($classId) {
            Write-Output "Cleaning up created test data (classId: $classId)..."
            try {
                Run-ApiTest -Name "DELETE /classes/:id (Cleanup)" -Uri "http://localhost:5000/classes/$classId" -Method DELETE
            } catch {
                Write-Warning "Failed to clean up test class $classId. You may need to remove it manually."
            }
        }
    }

    # --- 5. Run Frontend E2E Tests ---
    Write-Output "Running frontend E2E tests with Cypress..."
    try {
        # Assumes cypress is installed in the root
        Invoke-Expression "npm run cy:run"
        Write-Output "All Cypress tests passed successfully."
    } catch {
        throw "Cypress E2E tests failed. Details: $_"
    }

    # --- 5. Git Commit and Push ---
    Write-Output "Checking for local changes to commit..."
    if (git status --porcelain) {
        Write-Output "Changes detected. Staging and committing..."
        git add .
        git commit -m $CommitMessage
    } else {
        Write-Output "No local changes to commit."
    }

    $currentBranch = git rev-parse --abbrev-ref HEAD
    Write-Output "Attempting to push to origin $currentBranch..."
    git push origin $currentBranch
    Write-Output "Successfully pushed to origin $currentBranch."

}
finally {
    # --- 6. Final Cleanup ---
    if ($mainProc) {
        Write-Output "Script finished. Stopping main process (PID $($mainProc.Id)) and its children..."
        Stop-Process -Id $mainProc.Id -Force -ErrorAction SilentlyContinue
    }
    Pop-Location -ErrorAction SilentlyContinue
    Write-Output "=== run_all.ps1 finished ==="
}
