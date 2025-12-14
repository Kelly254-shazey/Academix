-- Migration to add new settings columns to user_settings table
-- Date: December 13, 2025

ALTER TABLE user_settings
ADD COLUMN class_reminders BOOLEAN DEFAULT TRUE,
ADD COLUMN attendance_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN system_updates BOOLEAN DEFAULT FALSE,
ADD COLUMN theme VARCHAR(20) DEFAULT 'light',
ADD COLUMN language VARCHAR(10) DEFAULT 'en',
ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
ADD COLUMN time_format VARCHAR(10) DEFAULT '12h',
ADD COLUMN profile_visibility VARCHAR(20) DEFAULT 'private',
ADD COLUMN attendance_visibility VARCHAR(20) DEFAULT 'private',
ADD COLUMN data_sharing BOOLEAN DEFAULT FALSE;