
-- ==========================================
-- 1. PROFILES TABLE & SECURITY
-- ==========================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  is_pro_plus boolean DEFAULT false,
  plan_id text DEFAULT 'free',
  subscription_end_date timestamptz,
  has_used_discount boolean DEFAULT false,
  last_cv_content text,
  last_cv_filename text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view/edit ONLY their own profile
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 2. APPLICATIONS TABLE (User History)
-- ==========================================

CREATE TABLE IF NOT EXISTS applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  job_title text,
  company_name text,
  cv_content text,
  cl_content text,
  match_score int,
  original_link text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Users view their own apps
CREATE POLICY "Users view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

-- Creation: Authenticated users insert with their ID. Guests insert with NULL.
CREATE POLICY "Allow insert for creation" ON applications
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Claiming: Users can update rows that belong to them OR rows that are currently Guest (null)
CREATE POLICY "Allow claim of guest apps" ON applications
  FOR UPDATE USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Deletion: Users delete their own.
CREATE POLICY "Users delete own applications" ON applications
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 3. JOB LISTINGS (Strict Admin Only)
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

-- Public Read
CREATE POLICY "Public read access to jobs" ON job_listings
  FOR SELECT USING (true);

-- Admin Write (Insert/Update/Delete) - LOCKED DOWN to your specific email
CREATE POLICY "Admin only modify" ON job_listings
  FOR ALL USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- ==========================================
-- 4. ORDERS & SUBSCRIPTIONS
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

-- Legacy table cleanup (if it exists from previous attempts)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Lock it down completely just in case
CREATE POLICY "Admin only subscriptions" ON subscriptions FOR ALL USING (false); 

-- ==========================================
-- 5. DAILY USAGE (Strict Logic)
-- ==========================================

CREATE TABLE IF NOT EXISTS daily_usage (
  identifier text NOT NULL, -- IP or User UUID
  date date DEFAULT CURRENT_DATE,
  cv_count int DEFAULT 0,
  search_count int DEFAULT 0,
  PRIMARY KEY (identifier, date)
);

ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Public Read (So UI can show "2/5 used")
CREATE POLICY "Allow read usage" ON daily_usage
  FOR SELECT USING (true);

-- WRITE SECURITY:
-- We DO NOT add Insert/Update policies here. 
-- This prevents clients from manually editing their usage.
-- All writes must go through the Secure Functions below.

-- ==========================================
-- 6. SECURE FUNCTIONS (Fixes Mutable Search Path)
-- ==========================================

-- 1. Reset Credits (Admin)
CREATE OR REPLACE FUNCTION reset_all_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIX: Security Alert Resolved
AS $$
BEGIN
  -- Double check admin status inside function for extra safety
  IF auth.jwt() ->> 'email' = 'mqhele03@gmail.com' THEN
    DELETE FROM daily_usage WHERE date = CURRENT_DATE;
  END IF;
END;
$$;

-- 2. Get Stats
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIX: Security Alert Resolved
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

-- 3. Increment Usage (Secure Write)
CREATE OR REPLACE FUNCTION increment_usage_secure(user_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIX: Security Alert Resolved
AS $$
BEGIN
  INSERT INTO daily_usage (identifier, date, cv_count, search_count)
  VALUES (user_identifier, CURRENT_DATE, 1, 0)
  ON CONFLICT (identifier, date)
  DO UPDATE SET cv_count = daily_usage.cv_count + 1;
END;
$$;

-- 4. Sync IP Usage to User (Secure Write)
CREATE OR REPLACE FUNCTION sync_usage_from_ip(ip_address text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIX: Security Alert Resolved
AS $$
DECLARE
  ip_count int;
  user_count int;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN; END IF;

  -- 1. Get usage for the IP address
  SELECT cv_count INTO ip_count FROM daily_usage WHERE identifier = ip_address AND date = CURRENT_DATE;
  IF ip_count IS NULL THEN ip_count := 0; END IF;

  -- 2. Get usage for the User ID
  SELECT cv_count INTO user_count FROM daily_usage WHERE identifier = current_user_id::text AND date = CURRENT_DATE;
  IF user_count IS NULL THEN user_count := 0; END IF;

  -- 3. Sync if IP has data
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
SET search_path = public -- FIX: Security Alert Resolved
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;
