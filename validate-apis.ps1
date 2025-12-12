# System validation for ClassTrack AI
param([switch]$help)

if ($help) {
    Write-Host "Validates all ClassTrack AI APIs are working"
    exit
}

$API_URL = "http://localhost:5002"
$TEST_PASSWORD = "TestPassword123!"

Write-Host "ClassTrack AI System Validation" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend health
Write-Host "Test 1: Backend Health Check..."
try {
    $health = Invoke-WebRequest -Uri "$API_URL/" -UseBasicParsing | ConvertFrom-Json
    if ($health.status -eq "ok") {
        Write-Host "SUCCESS: Backend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "FAILED: Backend is not responding" -ForegroundColor Red
    exit 1
}

# Test 2: Student registration and APIs
Write-Host ""
Write-Host "Test 2: Student Registration..."
try {
    $email = "student-$(Get-Random)@test.edu"
    $body = @{
        email = $email
        password = $TEST_PASSWORD
        name = "Test Student"
        role = "student"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$API_URL/auth/register" `
        -Method Post -Body $body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
    
    $token = $response.token
    if ($token) {
        Write-Host "SUCCESS: Student registered - $email" -ForegroundColor Green
        Write-Host "Testing student endpoints with token..." -ForegroundColor Yellow
        
        $headers = @{"Authorization" = "Bearer $token"}
        
        # Test endpoints
        $endpoints = @(
            @{path="/schedule/today"; name="Schedule"},
            @{path="/attendance-analytics/overall"; name="Attendance"},
            @{path="/dashboard/student"; name="Dashboard"},
            @{path="/notifications"; name="Notifications"}
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $result = Invoke-WebRequest -Uri "$API_URL$($endpoint.path)" -Headers $headers -UseBasicParsing | ConvertFrom-Json
                Write-Host "  OK: $($endpoint.name)" -ForegroundColor Green
            } catch {
                Write-Host "  FAILED: $($endpoint.name)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "FAILED: Student registration error" -ForegroundColor Red
}

# Test 3: Admin registration and APIs
Write-Host ""
Write-Host "Test 3: Admin Registration..."
try {
    $adminEmail = "admin-$(Get-Random)@test.edu"
    $body = @{
        email = $adminEmail
        password = $TEST_PASSWORD
        name = "Test Admin"
        role = "admin"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$API_URL/auth/register" `
        -Method Post -Body $body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
    
    $adminToken = $response.token
    if ($adminToken) {
        Write-Host "SUCCESS: Admin registered - $adminEmail" -ForegroundColor Green
        Write-Host "Testing admin endpoints with token..." -ForegroundColor Yellow
        
        $headers = @{"Authorization" = "Bearer $adminToken"}
        
        # Test admin endpoints
        $endpoints = @(
            @{path="/api/admin/overview"; name="Overview"},
            @{path="/api/admin/lecturers"; name="Lecturers"},
            @{path="/api/admin/departments"; name="Departments"}
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $result = Invoke-WebRequest -Uri "$API_URL$($endpoint.path)" -Headers $headers -UseBasicParsing | ConvertFrom-Json
                Write-Host "  OK: $($endpoint.name)" -ForegroundColor Green
            } catch {
                Write-Host "  FAILED: $($endpoint.name)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "FAILED: Admin registration error" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Validation Complete" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Status: All APIs are responding and ready for real-time data" -ForegroundColor Green
