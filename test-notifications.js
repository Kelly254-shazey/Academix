#!/usr/bin/env node

/**
 * Test script to demonstrate live notifications
 * This script simulates a lecturer sending notifications
 * and shows them appearing in real-time on the frontend
 */

const io = require('socket.io-client');

const BACKEND_URL = 'http://localhost:5000';

console.log('🚀 ClassTrack AI - Live Notification Test');
console.log('=========================================\n');

// Simulate multiple student connections
const studentSockets = [];

// Create 3 student connections
for (let i = 1; i <= 3; i++) {
  const socket = io(BACKEND_URL);
  
  socket.on('connect', () => {
    console.log(`✅ Student ${i} connected to notification server`);
    socket.emit('join-user-room', `student_${i}`);
  });

  socket.on('new-notification', (notification) => {
    console.log(`\n📢 [Student ${i}] Received notification:`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);
    if (notification.classTime) {
      console.log(`   Time: ${notification.classTime}`);
    }
    if (notification.location) {
      console.log(`   Location: ${notification.location}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Student ${i} disconnected`);
  });

  studentSockets.push(socket);
}

// After 2 seconds, simulate lecturer sending a class-start notification
setTimeout(() => {
  console.log('\n\n📤 [Lecturer] Sending class start notification...\n');

  fetch(`${BACKEND_URL}/notifications/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'class-start',
      title: 'Data Structures - Starting Soon',
      message: 'Class is starting in 5 minutes. Please be ready!',
      courseId: 1,
      course: 'Data Structures',
      classTime: '10:00 AM',
      location: 'Room A101',
      instructorId: 'lecturer_1',
      instructorName: 'Dr. James Smith',
      targetUsers: ['student_1', 'student_2', 'student_3']
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Notification sent successfully via API');
      console.log(`   Recipients: ${data.message}`);
    }
  })
  .catch(err => console.error('Error sending notification:', err));
}, 2000);

// After 5 seconds, send another notification
setTimeout(() => {
  console.log('\n\n📤 [Lecturer] Sending attendance notification...\n');

  fetch(`${BACKEND_URL}/notifications/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'missing-class',
      title: '⚠️ Attendance Issue',
      message: 'You were marked absent in Data Structures. Please contact the instructor.',
      courseId: 1,
      course: 'Data Structures',
      instructorId: 'lecturer_1',
      instructorName: 'Dr. James Smith',
      studentName: 'John Student',
      absenceReason: 'no-show',
      targetUsers: ['student_1']
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Attendance notification sent successfully via API');
    }
  })
  .catch(err => console.error('Error sending notification:', err));
}, 5000);

// Close connections after 10 seconds
setTimeout(() => {
  console.log('\n\n🔌 Closing connections...\n');
  studentSockets.forEach((socket, i) => {
    socket.disconnect();
  });
  process.exit(0);
}, 10000);
