# Logout Feature Documentation

## Overview

The logout feature has been enhanced to provide users with an easy, secure, and intuitive way to end their sessions. The system includes multiple logout methods with confirmation protection and automatic session timeout.

---

## 🚪 Logout Methods

### 1. **Manual Logout (Primary)**
Users can logout by clicking the user menu and confirming the logout action.

**Steps:**
1. Click the user profile button in the top-right navbar (shows username)
2. Click "🚪 Logout (Alt+L)" button
3. A confirmation dialog appears asking "Are you sure you want to logout?"
4. Click "Yes, Logout" to confirm or "Cancel" to stay logged in
5. You'll be redirected to the login page

**Features:**
- ✅ Confirmation dialog prevents accidental logouts
- ✅ Keyboard shortcut support (Alt+L)
- ✅ Clean, intuitive UI
- ✅ One-click access from any page

---

### 2. **Keyboard Shortcut**
Press **Alt+L** to logout (when user menu is open).

**How to use:**
1. Click the user profile button to open the menu
2. Press `Alt+L`
3. Confirm logout in the dialog

**Features:**
- ✅ Fast logout for power users
- ✅ Only works when menu is open (safety)
- ✅ Supported on Windows, Mac, and Linux

---

### 3. **Automatic Session Timeout**
Users are automatically logged out after **30 minutes of inactivity**.

**What triggers the timeout reset:**
- Mouse clicks
- Keyboard input
- Page scrolling
- Touch events
- Any user interaction

**What happens:**
- User is silently logged out
- Redirected to login page
- Token is cleared from localStorage
- No data loss (in-flight requests are cancelled)

**Features:**
- ✅ Security: Protects accounts from unauthorized access
- ✅ Non-intrusive: No warning popup (can be added if needed)
- ✅ Activity tracking: Resets on any user interaction
- ✅ Configurable: Easy to change timeout duration

---

## 🔐 Security Features

### Logout Confirmation
- Prevents accidental logouts by requiring confirmation
- Shows "Are you sure?" dialog before logging out
- User can cancel and stay logged in

### Backend Logout Endpoint
- API endpoint `/api/auth/logout` confirms logout
- Token validation ensures only authenticated users can logout
- Graceful error handling if backend is unavailable

### Token Cleanup
- JWT token immediately removed from `localStorage`
- Authorization header cleared from axios instance
- No residual authentication data remains

### Session Timeout
- Automatic logout after inactivity
- Protects shared computer usage
- Prevents unauthorized access to left-open sessions

---

## 💻 Implementation Details

### Frontend Components

#### 1. **AuthContext.js**
Enhanced `logout()` function:
```javascript
const logout = async () => {
  try {
    // Notify backend
    if (token) {
      await axios.post(`${API_URL}/auth/logout`);
    }
    // Clear local state
    setUser(null);
    setToken(null);
    setError(null);
  } catch (err) {
    // Force logout even if backend fails
    setUser(null);
    setToken(null);
  }
};
```

#### 2. **Navbar.js**
Logout with confirmation dialog:
- State variables: `showMenu`, `showLogoutConfirm`
- Confirmation buttons: "Yes, Logout" and "Cancel"
- Keyboard shortcut: Alt+L listener

#### 3. **useSessionTimeout.js** (New Hook)
Automatic inactivity logout:
- Monitors mouse, keyboard, scroll, touch events
- Default: 30 minutes inactivity timeout
- Configurable timeout duration
- Automatic redirect to login page

#### 4. **App.js**
Integrated session timeout:
```javascript
useSessionTimeout(30); // 30 minutes
```

### Backend Endpoint

**POST /api/auth/logout** (Protected)
```
Header: Authorization: Bearer <token>
Response: { success: true, message: 'Logged out successfully' }
```

---

## 🎨 UI/UX Enhancements

### Logout Button
- **Icon**: 🚪 (door emoji)
- **Text**: "Logout (Alt+L)" - shows keyboard shortcut
- **Color**: Red (#e74c3c) - indicates danger/logout action
- **Hover**: Background changes to light red

### Confirmation Dialog
- **Question**: "Are you sure you want to logout?"
- **Buttons**:
  - "Yes, Logout" - Red button, confirms action
  - "Cancel" - Gray button, cancels action
- **Styling**: Centered text, clear button positioning
- **Accessibility**: Large clickable areas, high contrast

### CSS Classes
- `.logout`: Logout button styling
- `.logout-confirmation`: Confirmation dialog container
- `.confirmation-buttons`: Button group layout
- `.confirm-btn`: Red confirmation button
- `.cancel-btn`: Gray cancel button

---

## 📋 User Guide

### For Students
1. Click your name in the top-right
2. Click "🚪 Logout (Alt+L)"
3. Confirm you want to logout
4. You'll be returned to the login screen

### For Lecturers
Same as students - one-click logout from any page.

### For Admins
Same - logout is available on all pages.

### Automatic Logout
- Happens silently after 30 minutes of no activity
- Triggered by: clicks, typing, scrolling, or touches
- Protects your account if you leave your computer

---

## 🔧 Customization Options

### Change Timeout Duration
Edit `App.js`:
```javascript
// Change 30 to desired minutes
useSessionTimeout(15); // 15 minutes instead
```

### Add Logout Warning
Create a warning component before automatic logout:
```javascript
// In useSessionTimeout.js
// Add warning dialog at 29 minutes
```

### Disable Session Timeout
Remove from `App.js`:
```javascript
// useSessionTimeout(30); // Comment out or remove
```

### Change Timeout Trigger Events
Edit `useSessionTimeout.js`:
```javascript
const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
// Add or remove events as needed
```

---

## 📱 Responsive Design

### Desktop
- User menu in top-right navbar
- Confirmation dialog styled for desktop
- Keyboard shortcut available

### Tablet
- Menu remains accessible
- Touch-friendly button sizes
- Confirmation dialog responsive

### Mobile
- User menu icon responsive
- Confirmation buttons full-width
- Easy to tap logout option

---

## ✅ Testing Checklist

### Manual Logout Test
- [ ] Click user profile button
- [ ] Click logout button
- [ ] Confirmation dialog appears
- [ ] Click "Cancel" - stays logged in
- [ ] Click logout again
- [ ] Click "Yes, Logout" - redirects to login
- [ ] Token removed from localStorage
- [ ] Cannot access protected pages

### Keyboard Shortcut Test
- [ ] Open user menu
- [ ] Press Alt+L
- [ ] Confirmation dialog appears
- [ ] Press Enter to confirm logout

### Session Timeout Test
- [ ] Login to system
- [ ] Wait 30 minutes without interaction
- [ ] Page automatically redirects to login
- [ ] No data lost or corrupted

### Multiple Devices Test
- [ ] Login on Device A
- [ ] Login on Device B with same account
- [ ] Logout on Device A
- [ ] Device B session remains active
- [ ] Each logout only affects that device

---

## 🐛 Troubleshooting

### Problem: Logout button not appearing
**Solution**: Check that you're logged in and Navbar is rendered
- Verify `isAuthenticated` is true
- Check browser console for errors

### Problem: Logout confirmation doesn't appear
**Solution**: Check React state management
- Clear browser cache
- Check if `showLogoutConfirm` state is working

### Problem: Doesn't redirect to login after logout
**Solution**: Check React Router navigation
- Verify `navigate('/login')` is working
- Check URL to see if it changed

### Problem: Token not cleared from localStorage
**Solution**: Verify AuthContext cleanup
- Open DevTools > Application > localStorage
- Check that 'token' key is removed
- Try logout again

### Problem: Session timeout not working
**Solution**: Verify useSessionTimeout hook
- Check if hook is being called in App.js
- Verify event listeners are attached
- Check browser console for errors

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Logout Countdown**: Show 5-minute warning before timeout
2. **Session Storage**: Remember session across browser restart
3. **Device Management**: Show active sessions, logout from specific devices
4. **Audit Logging**: Track logout events for security
5. **Email Notification**: Send logout confirmation email
6. **Two-Factor Auth**: Additional security on logout

---

## 📞 Support

For issues with logout functionality:
1. Check the troubleshooting section above
2. Verify backend is running (`npm start` in backend folder)
3. Check browser console for error messages
4. Review localStorage token status in DevTools

---

## Summary

Users can now easily logout through:
1. ✅ **Manual button click** - One-click logout with confirmation
2. ✅ **Keyboard shortcut** - Alt+L for quick logout
3. ✅ **Automatic timeout** - 30 minutes of inactivity

All logout methods are secure, user-friendly, and protect the user's account and data.
