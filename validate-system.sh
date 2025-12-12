#!/bin/bash
# Comprehensive system validation for ClassTrack AI

echo "=================================="
echo "ClassTrack AI - System Validation"
echo "=================================="
echo ""

API_URL="http://localhost:5002"
TEST_EMAIL="systest-$(date +%s)@test.edu"
TEST_PASSWORD="TestPassword123!"
STUDENT_TOKEN=""
ADMIN_TOKEN=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
  else
    echo -e "${RED}✗ $2${NC}"
  fi
}

# Test 1: Backend health check
echo "Test 1: Backend Health Check"
HEALTH=$(curl -s "$API_URL/" | grep -c '"status":"ok"')
if [ $HEALTH -gt 0 ]; then
  print_status 0 "Backend is running"
else
  print_status 1 "Backend is not responding"
  exit 1
fi
echo ""

# Test 2: Register test student
echo "Test 2: User Registration"
STUDENT_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"student-$RANDOM@test.edu\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Test Student\",
    \"role\": \"student\"
  }")

STUDENT_TOKEN=$(echo "$STUDENT_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$STUDENT_TOKEN" ]; then
  print_status 0 "Student registration successful"
else
  print_status 1 "Student registration failed"
fi
echo ""

# Test 3: Test student endpoints
if [ ! -z "$STUDENT_TOKEN" ]; then
  echo "Test 3: Student API Endpoints"
  
  # 3a: Schedule
  SCHEDULE=$(curl -s "$API_URL/schedule/today" \
    -H "Authorization: Bearer $STUDENT_TOKEN" | grep -c '"success":true')
  [ $SCHEDULE -gt 0 ] && print_status 0 "GET /schedule/today" || print_status 1 "GET /schedule/today"
  
  # 3b: Attendance
  ATTENDANCE=$(curl -s "$API_URL/attendance-analytics/overall" \
    -H "Authorization: Bearer $STUDENT_TOKEN" | grep -c '"success":true')
  [ $ATTENDANCE -gt 0 ] && print_status 0 "GET /attendance-analytics/overall" || print_status 1 "GET /attendance-analytics/overall"
  
  # 3c: Dashboard
  DASHBOARD=$(curl -s "$API_URL/dashboard/student" \
    -H "Authorization: Bearer $STUDENT_TOKEN" | grep -c '"message"')
  [ $DASHBOARD -gt 0 ] && print_status 0 "GET /dashboard/student" || print_status 1 "GET /dashboard/student"
  
  # 3d: Notifications
  NOTIFICATIONS=$(curl -s "$API_URL/notifications" \
    -H "Authorization: Bearer $STUDENT_TOKEN" | grep -c '"success":true')
  [ $NOTIFICATIONS -gt 0 ] && print_status 0 "GET /notifications" || print_status 1 "GET /notifications"
  
  echo ""
fi

# Test 4: Register admin
echo "Test 4: Admin Registration"
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin-$RANDOM@test.edu\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Test Admin\",
    \"role\": \"admin\"
  }")

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$ADMIN_TOKEN" ]; then
  print_status 0 "Admin registration successful"
else
  print_status 1 "Admin registration failed"
fi
echo ""

# Test 5: Test admin endpoints
if [ ! -z "$ADMIN_TOKEN" ]; then
  echo "Test 5: Admin API Endpoints"
  
  # 5a: Overview
  OVERVIEW=$(curl -s "$API_URL/api/admin/overview" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep -c '"success"')
  [ $OVERVIEW -gt 0 ] && print_status 0 "GET /api/admin/overview" || print_status 1 "GET /api/admin/overview"
  
  # 5b: Lecturers
  LECTURERS=$(curl -s "$API_URL/api/admin/lecturers" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep -c '"success"')
  [ $LECTURERS -gt 0 ] && print_status 0 "GET /api/admin/lecturers" || print_status 1 "GET /api/admin/lecturers"
  
  # 5c: Departments
  DEPARTMENTS=$(curl -s "$API_URL/api/admin/departments" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep -c '"success"')
  [ $DEPARTMENTS -gt 0 ] && print_status 0 "GET /api/admin/departments" || print_status 1 "GET /api/admin/departments"
  
  echo ""
fi

echo "=================================="
echo "System Validation Complete"
echo "=================================="
echo ""
echo "Next Steps:"
echo "1. Login to http://localhost:3001 with:"
echo "   Email: student-XXXX@test.edu (from registration above)"
echo "   Password: $TEST_PASSWORD"
echo ""
echo "2. Verify dashboard displays:"
echo "   - Today's classes from /schedule/today"
echo "   - Attendance percentage from /attendance-analytics/overall"
echo "   - Enrolled courses from /dashboard/student"
echo "   - System notifications from /notifications"
echo ""
echo "3. For admin features, use admin account:"
echo "   Email: admin-XXXX@test.edu (from registration above)"
echo "   Password: $TEST_PASSWORD"
