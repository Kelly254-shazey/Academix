# 🎯 Multi-Role Authentication - Test Scenarios

## Quick Navigation

- [30-Second Test](#30-second-test-immediate)
- [Comprehensive Testing](#comprehensive-testing)
- [Admin Features](#admin-features-test)
- [Real-World Scenarios](#real-world-scenarios)

---

## 30-Second Test (Immediate)

### Test: Quick Login as Student

1. **Navigate** to: `http://localhost:3000/login`
2. **Click**: "Login as Student" button
3. **Expected**: 
   - ✅ Auto-filled with `student@university.edu`
   - ✅ Redirected to dashboard
   - ✅ Navbar shows: Dashboard, QR Scanner, Attendance, Messages, Notifications
   - ✅ Avatar shows: 👨‍🎓

**Result**: ⏱️ 3 seconds

---

### Test: Quick Login as Lecturer

1. **Navigate** to: `http://localhost:3000/login`
2. **Click**: "Login as Lecturer" button
3. **Expected**:
   - ✅ Auto-filled with `lecturer@university.edu`
   - ✅ Redirected to dashboard
   - ✅ Navbar shows: Dashboard, QR Scanner, Attendance, Messages, **Notify Students**
   - ✅ Avatar shows: 👨‍🏫

**Result**: ⏱️ 3 seconds

---

### Test: Quick Login as Admin

1. **Navigate** to: `http://localhost:3000/login`
2. **Click**: "Login as Admin" button
3. **Expected**:
   - ✅ Auto-filled with `admin@university.edu`
   - ✅ Redirected to dashboard
   - ✅ Navbar shows: Dashboard, QR Scanner, Attendance, Messages, **Admin Panel**
   - ✅ Avatar shows: 👨‍💼
   - ✅ "Admin Panel" link visible in navbar

**Result**: ⏱️ 3 seconds

---

## Comprehensive Testing

### Test 1: Manual Login - Student

**Objective**: Test manual login process

**Steps**:
1. Go to `http://localhost:3000/login`
2. Clear demo credentials or manually enter:
   - Email: `student@university.edu`
   - Password: `password123`
3. Click "Sign In"
4. Verify redirect to dashboard

**Expected Outcomes**:
- ✅ No error messages
- ✅ Redirected to `/`
- ✅ User is logged in (can see dashboard)
- ✅ Token stored in localStorage
- ✅ User data visible in context

**Time**: ⏱️ 15 seconds

---

### Test 2: Invalid Credentials

**Objective**: Test error handling

**Steps**:
1. Go to `http://localhost:3000/login`
2. Enter:
   - Email: `wrong@email.com`
   - Password: `wrongpass`
3. Click "Sign In"
4. Wait for error

**Expected Outcomes**:
- ✅ Error message: "Invalid email or password"
- ✅ No redirect
- ✅ User stays on login page
- ✅ Can retry

**Time**: ⏱️ 5 seconds

---

### Test 3: Empty Fields

**Objective**: Test validation

**Steps**:
1. Go to `http://localhost:3000/login`
2. Leave email and password empty
3. Click "Sign In"

**Expected Outcomes**:
- ✅ Error message: "Please fill in all fields"
- ✅ No API call made
- ✅ Form stays on page

**Time**: ⏱️ 2 seconds

---

### Test 4: Page Reload - Session Persistence

**Objective**: Test auto-login after page reload

**Steps**:
1. Login as Student
2. Wait 2 seconds for confirmation
3. Refresh page (`F5`)
4. Wait for page to load

**Expected Outcomes**:
- ✅ No redirect to login
- ✅ User still logged in
- ✅ Dashboard visible
- ✅ User data restored from localStorage
- ✅ No loading screen (quick restore)

**Time**: ⏱️ 5 seconds

---

### Test 5: Logout Functionality

**Objective**: Test logout clears session

**Steps**:
1. Login as any role
2. Click user avatar in navbar (top right)
3. Click "🚪 Logout"
4. Observe redirect

**Expected Outcomes**:
- ✅ Redirected to login page
- ✅ localStorage cleared (token removed)
- ✅ User data cleared
- ✅ Cannot access protected pages
- ✅ Must login again to access dashboard

**Time**: ⏱️ 3 seconds

---

### Test 6: Role Badge in Dropdown

**Objective**: Test role display in user menu

**Steps**:
1. Login as Admin
2. Click user avatar (top right)
3. Observe dropdown menu

**Expected Outcomes**:
- ✅ Dropdown appears
- ✅ Role badge shows: "ADMIN"
- ✅ Badge has colored background
- ✅ Profile and Settings links visible
- ✅ Logout button visible

**Time**: ⏱️ 3 seconds

---

## Admin Features Test

### Test 1: Access Admin Panel (Admin Only)

**Objective**: Test admin-only route

**Steps**:
1. Login as Admin
2. Click "⚙️ Admin Panel" in navbar
3. Observe admin dashboard

**Expected Outcomes**:
- ✅ Admin dashboard loads
- ✅ Shows system overview
- ✅ Stats cards visible (Total Users, Students, Lecturers, Admins)
- ✅ Three tabs: Overview, Users, Settings
- ✅ No errors in console

**Time**: ⏱️ 5 seconds

---

### Test 2: Admin Cannot Access (Student/Lecturer)

**Objective**: Test route protection

**Steps**:
1. Login as Student
2. Manually navigate to: `http://localhost:3000/admin`
3. Observe what happens

**Expected Outcomes**:
- ✅ Access denied message shown
- ✅ Error: "Only administrators can access this page"
- ✅ Redirected back (or blocked)
- ✅ No admin features visible

**Time**: ⏱️ 3 seconds

---

### Test 3: Admin Dashboard - Overview Tab

**Objective**: Test system overview functionality

**Steps**:
1. Login as Admin
2. Go to Admin Panel
3. Click "📊 Overview" tab
4. Examine content

**Expected Outcomes**:
- ✅ System status: "🟢 Online"
- ✅ Database status: "🟢 Connected"
- ✅ WebSocket status: "🟢 Active"
- ✅ API Health: "🟢 Healthy"
- ✅ Features list visible
- ✅ 8+ features listed

**Time**: ⏱️ 5 seconds

---

### Test 4: Admin Dashboard - Users Tab

**Objective**: Test user management

**Steps**:
1. Login as Admin
2. Go to Admin Panel
3. Click "👥 Users" tab
4. View user list

**Expected Outcomes**:
- ✅ All users displayed
- ✅ At least 3 users shown (Student, Lecturer, Admin)
- ✅ User cards show: avatar, name, email, role
- ✅ Edit and Delete buttons visible
- ✅ No loading spinners

**Time**: ⏱️ 5 seconds

---

### Test 5: Admin Dashboard - Settings Tab

**Objective**: Test system settings

**Steps**:
1. Login as Admin
2. Go to Admin Panel
3. Click "⚙️ Settings" tab
4. Examine settings

**Expected Outcomes**:
- ✅ System Name field visible
- ✅ Database Type showing "In-Memory (Demo)"
- ✅ Backend Port: 5000
- ✅ Frontend Port: 3000
- ✅ JWT Expiry: 24 hours
- ✅ WebSocket Status: 🟢 Active

**Time**: ⏱️ 3 seconds

---

## Real-World Scenarios

### Scenario 1: Multi-Tab Simultaneous Login

**Objective**: Test independent role logins in multiple tabs

**Steps**:
1. **Tab 1**: Go to `http://localhost:3000/login`
2. **Tab 1**: Click "Login as Student"
3. **Tab 2**: Go to `http://localhost:3000/login` (new tab)
4. **Tab 2**: Click "Login as Lecturer"
5. **Tab 1**: Verify still logged in as Student
6. **Tab 2**: Verify logged in as Lecturer
7. **Both tabs**: Verify each works independently

**Expected Outcomes**:
- ✅ Tab 1: Student features visible
- ✅ Tab 2: Lecturer features visible
- ✅ Each tab has separate localStorage
- ✅ Logout in Tab 1 doesn't affect Tab 2
- ✅ Real-time notifications appear in both tabs

**Time**: ⏱️ 30 seconds

---

### Scenario 2: Lecturer Sends Notification, Student Receives

**Objective**: Test full notification flow across roles

**Steps**:
1. **Tab 1**: Login as Lecturer
2. **Tab 1**: Click "📢 Notify Students"
3. **Tab 1**: Enter notification message: "Test notification"
4. **Tab 1**: Click "Send"
5. **Tab 2**: Login as Student
6. **Tab 2**: Watch for notification
7. **Tab 2**: Check notification count badge

**Expected Outcomes**:
- ✅ Lecturer form submits successfully
- ✅ Success message shown: "Notification sent"
- ✅ Student sees notification immediately (real-time)
- ✅ Notification badge updates
- ✅ Message content visible: "Test notification"

**Time**: ⏱️ 30 seconds

---

### Scenario 3: Admin Views All Users While Others Login

**Objective**: Test system responsiveness with multiple active sessions

**Steps**:
1. **Tab 1**: Login as Admin
2. **Tab 1**: Go to Admin Panel → Users tab
3. **Tab 2**: Login as Student
4. **Tab 3**: Login as Lecturer
5. **Tab 1**: Check that all 3 users appear in user list
6. **Tab 1**: Verify counts updated

**Expected Outcomes**:
- ✅ Admin tab remains responsive
- ✅ All 3 roles successfully logged in
- ✅ User list shows current users
- ✅ Stats updated (3 total users visible)
- ✅ No errors or lag

**Time**: ⏱️ 30 seconds

---

### Scenario 4: Session Timeout Simulation

**Objective**: Test token expiration handling (24 hours)

**Steps**:
1. Login as Student
2. Note login time
3. Wait 5 seconds
4. Manually check localStorage for token
5. Verify token is still valid

**Expected Outcomes**:
- ✅ Token exists in localStorage
- ✅ Token format: JWT (header.payload.signature)
- ✅ Token contains correct user info
- ✅ Expiration time: 24 hours from login

**Time**: ⏱️ 10 seconds

---

### Scenario 5: Browser DevTools - Session Verification

**Objective**: Verify token storage and structure

**Steps**:
1. Login as Lecturer
2. Open DevTools (F12)
3. Go to Application → Local Storage
4. Find token and user entries
5. Click to expand and view contents

**Expected Outcomes**:
- ✅ `token` key exists
- ✅ `user` key exists
- ✅ Token is JWT format: 3 parts separated by dots
- ✅ User object contains: id, name, email, role, avatar
- ✅ No sensitive data in plain text

**Time**: ⏱️ 10 seconds

---

### Scenario 6: Quick Role Switching

**Objective**: Test rapidly switching between roles

**Steps**:
1. Login as Student
2. Wait 2 seconds
3. Logout
4. Login as Lecturer
5. Wait 2 seconds
6. Logout
7. Login as Admin
8. Verify admin features

**Expected Outcomes**:
- ✅ Each login completes successfully
- ✅ Correct features for each role
- ✅ UI updates instantly
- ✅ No errors or overlapping data
- ✅ Navbar updates appropriately

**Time**: ⏱️ 20 seconds

---

## Summary Checklist

### Must Pass Tests (Critical)
- [ ] Student quick login works
- [ ] Lecturer quick login works
- [ ] Admin quick login works
- [ ] Logout clears session
- [ ] Page reload preserves session
- [ ] Invalid credentials show error
- [ ] Admin panel only for admins

### Should Pass Tests (Important)
- [ ] Role badge displays in dropdown
- [ ] Admin can view users
- [ ] Statistics display correctly
- [ ] Settings page loads
- [ ] Multi-tab works independently
- [ ] Notifications work across tabs

### Nice to Have (Enhancement)
- [ ] Quick role switching works smoothly
- [ ] Session persistence across browser restart
- [ ] Error messages are helpful
- [ ] Loading states visible
- [ ] Responsive on mobile

---

## Test Report Template

```
TEST EXECUTION REPORT
====================

Date: ___________
Tester: ___________
System: ClassTrack AI - Multi-Role Authentication

PASSED TESTS:
- [ ] Student Login
- [ ] Lecturer Login
- [ ] Admin Login
- [ ] Admin Dashboard
- [ ] Logout
- [ ] Session Persistence
- [ ] Multi-Tab
- [ ] Notifications
- [ ] Role Badges
- [ ] Error Handling

FAILED TESTS:
(List any failures here)

ISSUES FOUND:
(List any bugs or issues)

OVERALL STATUS: ✅ PASS / ❌ FAIL

Comments:
_________________________________
_________________________________
```

---

## Quick Reference

| Test | Duration | Difficulty | Critical |
|------|----------|------------|----------|
| Quick Student Login | 3s | ⭐ | ✅ |
| Quick Lecturer Login | 3s | ⭐ | ✅ |
| Quick Admin Login | 3s | ⭐ | ✅ |
| Manual Login | 15s | ⭐⭐ | ✅ |
| Session Persistence | 5s | ⭐⭐ | ✅ |
| Admin Panel | 5s | ⭐⭐ | ✅ |
| Multi-Tab | 30s | ⭐⭐⭐ | ⭐ |
| Notifications | 30s | ⭐⭐⭐ | ⭐ |
| Token Verification | 10s | ⭐⭐ | ⭐ |

---

**Total Estimated Test Time**: 2-3 minutes for full suite  
**Quick Test Time**: 30 seconds for critical path  
**Status**: ✅ Ready to Test
