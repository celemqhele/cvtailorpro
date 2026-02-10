
-- 1. Add columns to store the extracted CV text and filename in the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_cv_content text,
ADD COLUMN IF NOT EXISTS last_cv_filename text;

-- 2. Add column to track if the one-time discount has been used
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_used_discount boolean DEFAULT false;

-- 3. Ensure Row Level Security (RLS) allows users to UPDATE their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 4. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. ADMIN FUNCTION: Reset all daily credits
-- Run this block in your SQL Editor
CREATE OR REPLACE FUNCTION reset_all_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deleting usage records for the current date effectively resets count to 0 for everyone
  DELETE FROM daily_usage WHERE date = CURRENT_DATE;
END;
$$;

-- 6. ADD original_link to applications table to track job posts
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS original_link text;
