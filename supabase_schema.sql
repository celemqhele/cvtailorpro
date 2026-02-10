
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
CREATE OR REPLACE FUNCTION reset_all_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM daily_usage WHERE date = CURRENT_DATE;
END;
$$;

-- 6. ADD original_link to applications table to track job posts
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS original_link text;

-- 7. SECURE USAGE STATS (Prevents Client-Clock Hacking)
-- Returns the current count AND the seconds remaining until server midnight
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usage_val int;
  seconds_left int;
BEGIN
  -- Get count for SERVER Date (Client clock is ignored)
  SELECT cv_count INTO usage_val FROM daily_usage
  WHERE identifier = user_identifier AND date = CURRENT_DATE;

  IF usage_val IS NULL THEN usage_val := 0; END IF;

  -- Calculate seconds until next midnight UTC (Server Time)
  seconds_left := EXTRACT(EPOCH FROM ((CURRENT_DATE + 1)::timestamptz - now()));

  RETURN json_build_object('count', usage_val, 'seconds_left', seconds_left);
END;
$$;

-- 8. SECURE INCREMENT (Prevents Client-Date Injection)
CREATE OR REPLACE FUNCTION increment_usage_secure(user_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or Update based on SERVER DATE
  INSERT INTO daily_usage (identifier, date, cv_count, search_count)
  VALUES (user_identifier, CURRENT_DATE, 1, 0)
  ON CONFLICT (identifier, date)
  DO UPDATE SET cv_count = daily_usage.cv_count + 1;
END;
$$;
