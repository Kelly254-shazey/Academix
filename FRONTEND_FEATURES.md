# ClassTrack AI - Frontend Documentation

## 🚀 Project Structure

The interactive frontend has been successfully created with:

### Navigation Bar Features
- **Logo & Branding**: ClassTrack AI with icon
- **Navigation Menu**: Dashboard, Attendance, Messages (with unread badge)
- **Search Bar**: Quick search functionality
- **User Menu**: Profile dropdown with settings and logout
- **Real-time Badge**: Shows number of unread messages

### Pages & Components

#### 1. **Dashboard** (`/`)
- Welcome message with user's name
- Statistics Cards showing:
  - Overall attendance percentage
  - Total classes attended
  - Unread messages count
  - Pending assignments
- **Today's Classes Section**:
  - List of upcoming classes with time and location
  - Instructor information
  - Quick view buttons
- **Recent Activity Section**:
  - Timeline of recent events
  - Attendance check-ins
  - Messages received
- **Quick Actions Section**:
  - Scan QR Code
  - View Reports
  - Notifications
  - Contact Support

#### 2. **Messages** (`/messages`)
- **Sidebar with Conversations**:
  - List of all chats
  - Unread message indicator (blue dot)
  - Last message preview
  - Timestamp for each conversation
  - Search functionality
- **Main Chat Area**:
  - Chat header with contact info
  - Online status indicator
  - Call and video call buttons
  - Message history with timestamps
  - Distinguishes own messages from received messages
- **Message Input**:
  - Real-time message sending
  - Emoji and attachment buttons
  - Send button with visual feedback
- **Features**:
  - Click to select conversations
  - Automatic unread message clearing
  - Message counter in navbar updates in real-time

#### 3. **Attendance** (`/attendance`)
- **Overall Statistics**:
  - Circular progress indicator (SVG-based)
  - Attendance percentage display
  - Summary counts (Present, Absent, Late, Total)
- **Three View Tabs**:
  - **Today**: Daily class attendance status
  - **This Week**: Bar chart showing daily attendance breakdown
  - **This Month**: Weekly summary with percentages
- **Status Badges**:
  - Present (Green)
  - Absent (Red)
  - Late (Yellow)
  - Pending (Blue)
- **Visual Analytics**:
  - Stacked bar charts for weekly view
  - Detailed breakdown for monthly view
  - Color-coded status indicators

#### 4. **Profile** (`/profile`)
- **Left Sidebar** (Sticky):
  - Large user avatar
  - User name and role
  - Change avatar button
  - Personal statistics:
    - Attendance percentage
    - Classes attended
    - Current grade
- **Forms & Settings**:
  - **Personal Information Section**:
    - Editable fields: Name, Email, Phone, Department
    - Read-only fields: Student ID, Year of Study
    - Edit/Save toggle button
  - **Notification Preferences**:
    - Email notifications
    - SMS notifications
    - Push notifications
    - Weekly reports
    - Attendance alerts
    - Dark mode toggle
  - **Danger Zone**:
    - Change password option
    - Delete account option

### 🎨 Design Features

#### Color Scheme
- **Primary Gradient**: Purple (#667eea to #764ba2)
- **Success Green**: #2ed573
- **Danger Red**: #ff7675
- **Warning Yellow**: #fdcb6e
- **Info Blue**: #0984e3

#### UI Components
- ✅ **Smooth Animations**: Fade-in effects and transitions
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎯 **Interactive Elements**: Hover effects, active states
- 🌟 **Status Indicators**: Badges, dots, color-coded elements
- 📊 **Data Visualization**: Charts and progress indicators
- 🔔 **Notification System**: Badge counters and indicators

### 🔧 Technical Stack
- **Framework**: React 18.2
- **Routing**: React Router v6
- **State Management**: React Hooks (useState)
- **Styling**: CSS3 with modern features
- **Icons**: Unicode Emoji
- **Responsive**: CSS Media Queries

### 📱 Responsive Breakpoints
- Desktop: Full layout
- Tablet (≤768px): Adjusted grid and sidebar
- Mobile (≤480px): Compact navigation and stacked layout

### ✨ Interactive Features
1. **Real-time Message Updates**: Send and receive messages instantly
2. **Tab Switching**: Navigate between different views
3. **Editable Profile**: Toggle edit mode for profile information
4. **Preference Management**: Toggle multiple settings
5. **Conversation Selection**: Click to select and view chats
6. **Search Functionality**: Search conversations and navigate

### 🎯 User Experience
- Intuitive navigation bar showing all key sections
- Clear visual hierarchy with color-coding
- Smooth transitions between pages
- Real-time updates (messages, unread count)
- Accessible forms and interactive elements
- Mobile-friendly responsive design

## 📍 Access Points
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Navigation**: Use navbar to switch between Dashboard, Attendance, Messages, and Profile
