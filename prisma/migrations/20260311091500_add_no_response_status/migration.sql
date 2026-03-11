-- Add new enum value for application status
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'No response';
