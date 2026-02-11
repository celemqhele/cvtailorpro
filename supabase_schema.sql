
-- ==========================================
-- 1. PROFILES TABLE & SECURITY
-- ==========================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  -- Subscription Columns
  is_pro_plus boolean DEFAULT false,
  plan_id text DEFAULT 'free',
  subscription_end_date timestamptz,
  has_used_discount boolean DEFAULT false,
  -- CV Storage
  last_cv_content text,
  last_cv_filename text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own profile
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile (e.g. name, saved cv)
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 2. APPLICATIONS TABLE (User History)
-- ==========================================

CREATE TABLE IF NOT EXISTS applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL, -- Nullable for Guest Users
  job_title text,
  company_name text,
  cv_content text,
  cl_content text,
  match_score int,
  original_link text,
  expires_at timestamptz, -- For guest expiration
  created_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users view their own apps
CREATE POLICY "Users view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Creation. 
-- Authenticated users insert with their ID. 
-- Guests (auth.uid() is null) insert with user_id as null.
CREATE POLICY "Allow insert for creation" ON applications
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Policy: Claiming.
-- Users can update rows that belong to them OR rows that are currently Guest (null)
CREATE POLICY "Allow claim of guest apps" ON applications
  FOR UPDATE USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Policy: Deletion. Users delete their own.
CREATE POLICY "Users delete own applications" ON applications
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. JOB LISTINGS (Admin Only)
-- ==========================================

CREATE TABLE IF NOT EXISTS job_listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  summary text,
  description text,
  original_link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read
CREATE POLICY "Public read access to jobs" ON job_listings
  FOR SELECT USING (true);

-- Policy: Admin Write (Insert/Update/Delete)
-- Replace 'mqhele03@gmail.com' with your actual admin email if different
CREATE POLICY "Admin only insert" ON job_listings
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

CREATE POLICY "Admin only update" ON job_listings
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

CREATE POLICY "Admin only delete" ON job_listings
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- ==========================================
-- 4. ORDERS (Strict Owner Access)
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  plan_id text NOT NULL,
  amount numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 5. DAILY USAGE & SECURE FUNCTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS daily_usage (
  identifier text NOT NULL, -- IP or User UUID
  date date DEFAULT CURRENT_DATE,
  cv_count int DEFAULT 0,
  search_count int DEFAULT 0,
  PRIMARY KEY (identifier, date)
);

ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read (Required for UI to show "2/5 Credits Used")
CREATE POLICY "Allow read usage" ON daily_usage
  FOR SELECT USING (true);

-- NOTE: No INSERT/UPDATE policies here. All writes must go through the Secure RPC functions below.
-- This prevents users from resetting their own credit count via the API.

-- --- SECURE FUNCTIONS (Fixed Mutable Search Path) ---

-- 1. Reset Credits (Admin)
CREATE OR REPLACE FUNCTION reset_all_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Fixes Security Alert
AS $$
BEGIN
  -- Optional: Check for admin email here for double security
  DELETE FROM daily_usage WHERE date = CURRENT_DATE;
END;
$$;

-- 2. Get Stats
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Fixes Security Alert
AS $$
DECLARE
  usage_val int;
  seconds_left int;
BEGIN
  SELECT cv_count INTO usage_val FROM daily_usage
  WHERE identifier = user_identifier AND date = CURRENT_DATE;

  IF usage_val IS NULL THEN usage_val := 0; END IF;

  seconds_left := EXTRACT(EPOCH FROM ((CURRENT_DATE + 1)::timestamptz - now()));

  RETURN json_build_object('count', usage_val, 'seconds_left', seconds_left);
END;
$$;

-- 3. Increment Usage
CREATE OR REPLACE FUNCTION increment_usage_secure(user_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Fixes Security Alert
AS $$
BEGIN
  INSERT INTO daily_usage (identifier, date, cv_count, search_count)
  VALUES (user_identifier, CURRENT_DATE, 1, 0)
  ON CONFLICT (identifier, date)
  DO UPDATE SET cv_count = daily_usage.cv_count + 1;
END;
$$;

-- 4. Sync IP Usage to User (New: Replaces client-side logic)
-- This allows us to securely transfer credits from a Guest IP to a new User ID without opening the table to public writes.
CREATE OR REPLACE FUNCTION sync_usage_from_ip(ip_address text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_count int;
  user_count int;
  current_user_id uuid;
BEGIN
  -- Get the ID of the user calling this function
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN; END IF;

  -- 1. Get usage for the IP address
  SELECT cv_count INTO ip_count FROM daily_usage WHERE identifier = ip_address AND date = CURRENT_DATE;
  IF ip_count IS NULL THEN ip_count := 0; END IF;

  -- 2. Get usage for the User ID
  SELECT cv_count INTO user_count FROM daily_usage WHERE identifier = current_user_id::text AND date = CURRENT_DATE;
  IF user_count IS NULL THEN user_count := 0; END IF;

  -- 3. If IP has more usage than user (meaning they just signed up after using the tool), update the user's record
  IF ip_count > user_count THEN
    INSERT INTO daily_usage (identifier, date, cv_count, search_count)
    VALUES (current_user_id::text, CURRENT_DATE, ip_count, 0)
    ON CONFLICT (identifier, date)
    DO UPDATE SET cv_count = ip_count;
  END IF;
END;
$$;

-- 5. Handle New User Trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Fixes Security Alert
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;
