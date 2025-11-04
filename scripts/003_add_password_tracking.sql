-- Add columns to profiles table to store current password (for admin viewing)
-- This is for educational/administrative purposes only

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS current_password TEXT,
ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_password_updated_at ON profiles(password_updated_at);

-- Comment on columns
COMMENT ON COLUMN profiles.current_password IS 'Current user password (plaintext for admin viewing only)';
COMMENT ON COLUMN profiles.password_updated_at IS 'Timestamp when password was last updated';
