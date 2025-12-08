# Real-Time Notifications - Quick Start Test

## One-Minute Setup & Test

### Prerequisites
- ✓ Backend running on port 5000
- ✓ Frontend running on port 3000
- ✓ Two browser windows/tabs

### Step-by-Step Test

#### Step 1: Open Two Browser Windows
**Window A (Lecturer):**
```
http://localhost:3000/login
Demo Credentials: lecturer / password123
```

**Window B (Student):**
```
http://localhost:3000/login
Demo Credentials: student / password123
```

#### Step 2: Position Windows Side-by-Side
This lets you see real-time delivery happening.

#### Step 3: Navigate Student to Notifications
- Window B: Click "Notifications" in navbar
- You should see notifications list (possibly empty)

#### Step 4: Send Notification from Lecturer
- Window A: Click "Notify Students"
- Select Notification Type: "Class Starting"
- Select Course: "Data Structures"
- Enter Class Time: "10:30 AM"
- Enter Location: "Lab 101"
- Enter Message: "Class is starting now!"
- Click "Send Notification"

#### Step 5: Observe Instant Delivery
**Expected in Window A:**
```
✅ Class start notification sent INSTANTLY to 30 students!
```

**Expected in Window B (INSTANTLY):**
- Notification appears at top of list
- Unread count increases in navbar (1)
- Green badge shows "✓ Delivered instantly"
- Notification shows current timestamp

### Verification Checklist

✓ Console Logs (Press F12 → Console)

**Server Output (Backend):**
```
📢 Broadcasting notification "Data Structures Starting Soon" to all connected students
```

**Client Output (Student's Browser):**
```
🔔 INSTANT notification received: {id: "notif_...", title: "..."}
```

✓ UI Elements

- [ ] Notification appears in < 1 second
- [ ] Badge count updates (from 0 to 1)
- [ ] Green "Delivered instantly" badge visible
- [ ] Notification shows correct course, time, location
- [ ] Unread indicator (●) visible
- [ ] Can mark as read by clicking
- [ ] Can delete with ✕ button

### Advanced Test Scenarios

#### Scenario 1: Multiple Students
1. Open 3+ browser windows as different students
2. Send notification from lecturer
3. **Expected:** Notification appears in ALL student windows simultaneously

#### Scenario 2: Multiple Courses
1. Lecturer sends notification for Course A
2. Lecturer sends notification for Course B
3. **Expected:** Students see course-specific notifications with correct details

#### Scenario 3: Rapid Notifications
1. Lecturer sends 5 notifications quickly (< 10 seconds)
2. **Expected:** All appear instantly without delay or missed notifications

#### Scenario 4: Missing Class Alert
1. From lecturer portal, select "Missing Class" type
2. Select a student name
3. Send notification
4. **Expected:** Student receives alert with attendance warning

#### Scenario 5: Connection Interruption
1. Student has notification center open
2. Disable network (Dev Tools → Network → Offline)
3. Lecturer sends notification
4. Re-enable network
5. **Expected:** Missing notification syncs automatically when connection restored

### Performance Metrics

Time notification from send to appearance:
- **Excellent:** < 500ms
- **Good:** < 1 second
- **Acceptable:** < 2 seconds

### Success Criteria

✅ **All Test Passed If:**
1. Notifications appear instantly (< 1 second)
2. Green "Delivered instantly" badge visible
3. Unread count updates in real-time
4. No page refresh needed
5. Works with multiple concurrent students
6. Browser console shows no errors
7. Backend logs show broadcasting

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Notification doesn't appear | Socket not connected | Check console for `✅ Connected` message |
| Long delay (> 5 seconds) | Backend overload | Restart backend server |
| "Delivered" badge missing | CSS not loaded | Clear cache, hard refresh (Ctrl+Shift+R) |
| Can't mark as read | API error | Check backend logs for 404 errors |
| Unread count wrong | State sync issue | Refresh page to resync |

### Debug Commands

**Student's Browser Console:**
```javascript
// Check if socket is connected
console.log(document.querySelector('[data-socket]'))

// Manually send test notification
fetch('http://localhost:5000/notifications/send', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    type: 'class-start',
    title: 'TEST Notification',
    message: 'This is a test',
    instructorId: 'test'
  })
})
```

**Server Logs:**
```bash
# Watch for broadcasting messages
tail -f /path/to/server/logs | grep "Broadcasting"
```

### Expected Timeline

| Event | Time | Status |
|-------|------|--------|
| Lecturer clicks "Send" | T+0ms | ✓ |
| Backend broadcasts | T+10ms | ✓ |
| Socket receives at student | T+50-100ms | ✓ |
| React state updates | T+120ms | ✓ |
| UI renders | T+150ms | ✓ |
| **Total** | **< 200ms** | ✓ |

### Test Report Template

```
DATE: _______________
TESTER: _______________
BROWSERS: _______________

RESULTS:
✓ / ✗ Instant delivery (< 1 second)
✓ / ✗ Delivered badge visible
✓ / ✗ Unread count updates
✓ / ✗ Multiple students receive notification
✓ / ✗ No console errors
✓ / ✗ Backend logs show broadcasting

NOTES:
_________________________
_________________________

OVERALL: PASS / FAIL
```

---

**Ready to test? Start with Step 1! 🚀**
