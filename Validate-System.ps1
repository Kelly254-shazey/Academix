# Comprehensive system validation for ClassTrack AI

Write-Host "=================================="
Write-Host "ClassTrack AI - System Validation"
Write-Host "=================================="
Write-Host ""

$API_URL = "http://localhost:5002"
$TEST_PASSWORD = "TestPassword123!"
$STUDENT_TOKEN = ""
$ADMIN_TOKEN = ""

# Function to print status
function PrintStatus {
    param([bool]$success, [string]$message)
    if ($success) {
        Write-Host "✓ $message" -ForegroundColor Green
    } else {
        Write-Host "✗ $message" -ForegroundColor Red
    }
}

try {
    # Test 1: Backend health check
    Write-Host "Test 1: Backend Health Check" -ForegroundColor Cyan
    $health = Invoke-WebRequest -Uri "$API_URL/" -UseBasicParsing | ConvertFrom-Json
    PrintStatus ($health.status -eq "ok") "Backend is running"
    Write-Host ""

    # Test 2: Register test student
    Write-Host "Test 2: Student Registration" -ForegroundColor Cyan
    $studentEmail = "student-$(Get-Random)@test.edu"
    $studentBody = @{
        email = $studentEmail
        password = $TEST_PASSWORD
        name = "Test Student"
        role = "student"
    } | ConvertTo-Json
    
    $studentResponse = Invoke-WebRequest -Uri "$API_URL/auth/register" `
        -Method Post -Body $studentBody -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
    
    $STUDENT_TOKEN = $studentResponse.token
    if ($STUDENT_TOKEN) {
        PrintStatus $true "Student registration successful: $studentEmail"
        Write-Host "  Token: $($STUDENT_TOKEN.Substring(0, 20))..." -ForegroundColor DarkGray
    } else {
        PrintStatus $false "Student registration failed"
    }
    Write-Host ""

    # Test 3: Test student endpoints
    if ($STUDENT_TOKEN) {
        Write-Host "Test 3: Student API Endpoints" -ForegroundColor Cyan
        
        $headers = @{"Authorization" = "Bearer $STUDENT_TOKEN"}
        
        # 3a: Schedule
        try {
            $schedule = Invoke-WebRequest -Uri "$API_URL/schedule/today" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus ($schedule.success) "GET /schedule/today"
        } catch {
            PrintStatus $false "GET /schedule/today"
        }
        
        # 3b: Attendance
        try {
            $attendance = Invoke-WebRequest -Uri "$API_URL/attendance-analytics/overall" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus ($attendance.success) "GET /attendance-analytics/overall"
        } catch {
            PrintStatus $false "GET /attendance-analytics/overall"
        }
        
        # 3c: Dashboard
        try {
            $dashboard = Invoke-WebRequest -Uri "$API_URL/dashboard/student" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus $true "GET /dashboard/student"
        } catch {
            PrintStatus $false "GET /dashboard/student"
        }
        
        # 3d: Notifications
        try {
            $notifications = Invoke-WebRequest -Uri "$API_URL/notifications" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus ($notifications.success) "GET /notifications"
        } catch {
            PrintStatus $false "GET /notifications"
        }
        
        Write-Host ""
    }

    # Test 4: Register admin
    Write-Host "Test 4: Admin Registration" -ForegroundColor Cyan
    $adminEmail = "admin-$(Get-Random)@test.edu"
    $adminBody = @{
        email = $adminEmail
        password = $TEST_PASSWORD
        name = "Test Admin"
        role = "admin"
    } | ConvertTo-Json
    
    $adminResponse = Invoke-WebRequest -Uri "$API_URL/auth/register" `
        -Method Post -Body $adminBody -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json
    
    $ADMIN_TOKEN = $adminResponse.token
    if ($ADMIN_TOKEN) {
        PrintStatus $true "Admin registration successful: $adminEmail"
        Write-Host "  Token: $($ADMIN_TOKEN.Substring(0, 20))..." -ForegroundColor DarkGray
    } else {
        PrintStatus $false "Admin registration failed"
    }
    Write-Host ""

    # Test 5: Test admin endpoints
    if ($ADMIN_TOKEN) {
        Write-Host "Test 5: Admin API Endpoints" -ForegroundColor Cyan
        
        $headers = @{"Authorization" = "Bearer $ADMIN_TOKEN"}
        
        # 5a: Overview
        try {
            $overview = Invoke-WebRequest -Uri "$API_URL/api/admin/overview" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus $true "GET /api/admin/overview"
        } catch {
            PrintStatus $false "GET /api/admin/overview"
        }
        
        # 5b: Lecturers
        try {
            $lecturers = Invoke-WebRequest -Uri "$API_URL/api/admin/lecturers" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus $true "GET /api/admin/lecturers"
        } catch {
            PrintStatus $false "GET /api/admin/lecturers"
        }
        
        # 5c: Departments
        try {
            $departments = Invoke-WebRequest -Uri "$API_URL/api/admin/departments" -Headers $headers -UseBasicParsing | ConvertFrom-Json
            PrintStatus $true "GET /api/admin/departments"
        } catch {
            PrintStatus $false "GET /api/admin/departments"
        }
        
        Write-Host ""
    }

    Write-Host "=================================="
    Write-Host "System Validation Complete" -ForegroundColor Green
    Write-Host "=================================="
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Open http://localhost:3001 in your browser"
    Write-Host "2. Login with student credentials:"
    Write-Host "   Email: $studentEmail"
    Write-Host "   Password: $TEST_PASSWORD"
    Write-Host ""
    Write-Host "3. Verify dashboard displays real data from API endpoints:"
    Write-Host "   - Todays classes from /schedule/today"
    Write-Host "   - Attendance percentage from /attendance-analytics/overall"
    Write-Host "   - Enrolled courses from /dashboard/student"
    Write-Host "   - System notifications from /notifications"
    Write-Host ""
    Write-Host "4. For admin features, login with admin credentials:"
    Write-Host "   Email: $adminEmail"
    Write-Host "   Password: $TEST_PASSWORD"

} catch {
    Write-Host "Error during validation:" -ForegroundColor Red
    Write-Host $_
}
