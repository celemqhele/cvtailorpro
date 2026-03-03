
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
  role text DEFAULT 'candidate', -- 'candidate', 'recruiter', 'admin'
  opt_in_headhunter boolean DEFAULT false,
  credits int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view/edit ONLY their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
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
DROP POLICY IF EXISTS "Users view own applications" ON applications;
CREATE POLICY "Users view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

-- Creation: Authenticated users insert with their ID. Guests insert with NULL.
-- FIX: Replaces permissive "true" check with strict ownership check
DROP POLICY IF EXISTS "Allow insert for creation" ON applications;
CREATE POLICY "Allow insert for creation" ON applications
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id) OR 
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Claiming: Users can update rows that belong to them OR rows that are currently Guest (null)
DROP POLICY IF EXISTS "Allow claim of guest apps" ON applications;
CREATE POLICY "Allow claim of guest apps" ON applications
  FOR UPDATE USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Deletion: Users delete their own.
DROP POLICY IF EXISTS "Users delete own applications" ON applications;
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
  example_cv_content text, -- Fictional CV JSON for preview
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

-- Public Read
DROP POLICY IF EXISTS "Public read access to jobs" ON job_listings;
CREATE POLICY "Public read access to jobs" ON job_listings
  FOR SELECT USING (true);

-- Admin Write (Insert/Update/Delete) - LOCKED DOWN to your specific email
-- FIX: Replaces permissive "Enable delete/insert for all users" policies
DROP POLICY IF EXISTS "Admin only insert" ON job_listings;
CREATE POLICY "Admin only insert" ON job_listings
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only update" ON job_listings;
CREATE POLICY "Admin only update" ON job_listings
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete" ON job_listings;
CREATE POLICY "Admin only delete" ON job_listings
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- ==========================================
-- 4. ARTICLES (Dynamic SEO Content)
-- ==========================================

CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text,
  category text,
  read_time text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Public Read
DROP POLICY IF EXISTS "Public read access to articles" ON articles;
CREATE POLICY "Public read access to articles" ON articles
  FOR SELECT USING (true);

-- Admin Write (Strict)
DROP POLICY IF EXISTS "Admin only insert articles" ON articles;
CREATE POLICY "Admin only insert articles" ON articles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only update articles" ON articles;
CREATE POLICY "Admin only update articles" ON articles
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete articles" ON articles;
CREATE POLICY "Admin only delete articles" ON articles
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- ==========================================
-- 5. ORDERS & SUBSCRIPTIONS
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

DROP POLICY IF EXISTS "Users view own orders" ON orders;
CREATE POLICY "Users view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own orders" ON orders;
CREATE POLICY "Users create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Legacy table cleanup (if it exists from previous attempts)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Lock it down completely just in case
DROP POLICY IF EXISTS "Admin only subscriptions" ON subscriptions;
CREATE POLICY "Admin only subscriptions" ON subscriptions FOR ALL USING (false); 

-- ==========================================
-- 6. DAILY USAGE (Strict Logic)
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
DROP POLICY IF EXISTS "Allow read usage" ON daily_usage;
CREATE POLICY "Allow read usage" ON daily_usage
  FOR SELECT USING (true);

-- WRITE SECURITY:
-- We DO NOT add Insert/Update policies here for public access.
-- This fixes the "Allow anonymous access for ALL" alert.
-- All writes must go through the Secure Functions below.

-- ==========================================
-- 7. SECURE FUNCTIONS (Fixes Mutable Search Path)
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
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==========================================
-- 8. MIGRATIONS (Run these if column missing)
-- ==========================================

-- Fix: cv_applications table (the actual table used by the codebase)
-- If cv_applications exists but is missing expires_at column, add it:
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cv_applications') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cv_applications' AND column_name = 'expires_at') THEN
      ALTER TABLE cv_applications ADD COLUMN expires_at timestamptz DEFAULT NULL;
    END IF;
  ELSE
    -- Create cv_applications if it doesn't exist
    CREATE TABLE cv_applications (
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

    ALTER TABLE cv_applications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users view own cv_applications" ON cv_applications
      FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

    CREATE POLICY "Allow insert for cv_applications" ON cv_applications
      FOR INSERT WITH CHECK (
        (auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND user_id IS NULL)
      );

    CREATE POLICY "Allow update cv_applications" ON cv_applications
      FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

    CREATE POLICY "Users delete own cv_applications" ON cv_applications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Revenue tracking (plan_purchases)
CREATE TABLE IF NOT EXISTS plan_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan_type TEXT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  credits_applied DECIMAL(10,2) DEFAULT 0,
  net_revenue DECIMAL(10,2) GENERATED ALWAYS AS (amount_paid - credits_applied) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only view plan_purchases" ON plan_purchases;
CREATE POLICY "Admin only view plan_purchases" ON plan_purchases
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');
DROP POLICY IF EXISTS "Allow insert plan_purchases" ON plan_purchases;
CREATE POLICY "Allow insert plan_purchases" ON plan_purchases
  FOR INSERT WITH CHECK (true);

-- Lead captures (email submissions) - separate from leads for clearer tracking  
CREATE TABLE IF NOT EXISTS email_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  cv_id UUID,
  source TEXT, -- 'facebook', 'linkedin', 'organic'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only view email_captures" ON email_captures;
CREATE POLICY "Admin only view email_captures" ON email_captures
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');
DROP POLICY IF EXISTS "Allow public insert email_captures" ON email_captures;
CREATE POLICY "Allow public insert email_captures" ON email_captures
  FOR INSERT WITH CHECK (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_email_captures_timestamp ON email_captures(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cv_applications_user_id ON cv_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_applications_created_at ON cv_applications(created_at);

-- Updated analytics summary function with errors_unsolved and traffic_total
CREATE OR REPLACE FUNCTION get_admin_analytics_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_traffic int;
  traffic_all int;
  total_revenue numeric;
  returning_users int;
  new_users int;
  live_sessions int;
  cv_generated int;
  own_cv_clicks int;
  continue_clicks int;
  unsolved_errors int;
  recent_errors json;
BEGIN
  IF auth.jwt() ->> 'email' != 'mqhele03@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*) INTO total_traffic FROM page_views WHERE created_at > now() - interval '24 hours';
  SELECT count(*) INTO traffic_all FROM page_views;
  SELECT coalesce(sum(amount), 0) INTO total_revenue FROM orders WHERE status = 'completed';
  SELECT count(*) INTO returning_users FROM visitor_sessions WHERE is_returning = true AND created_at > now() - interval '7 days';
  SELECT count(*) INTO new_users FROM visitor_sessions WHERE is_returning = false AND created_at > now() - interval '7 days';
  SELECT count(*) INTO live_sessions FROM visitor_sessions WHERE last_active_at > now() - interval '5 minutes';
  SELECT count(*) INTO cv_generated FROM user_events WHERE event_name = 'cv_generated';
  SELECT count(*) INTO own_cv_clicks FROM user_events WHERE event_name = 'use_own_cv';
  SELECT count(*) INTO continue_clicks FROM user_events WHERE event_name = 'continue_to_app';
  SELECT count(*) INTO unsolved_errors FROM error_logs WHERE is_solved = false;

  SELECT json_agg(t) INTO recent_errors FROM (
    SELECT message, created_at FROM error_logs ORDER BY created_at DESC LIMIT 5
  ) t;

  RETURN json_build_object(
    'traffic_24h', total_traffic,
    'traffic_total', traffic_all,
    'revenue_total', total_revenue,
    'returning_7d', returning_users,
    'new_7d', new_users,
    'live_sessions', live_sessions,
    'cv_generated', cv_generated,
    'own_cv_clicks', own_cv_clicks,
    'continue_clicks', continue_clicks,
    'errors_unsolved', unsolved_errors,
    'recent_errors', recent_errors
  );
END;
$$;

-- ==========================================
-- 9. QUICK APPLY USAGE (Strict IP Limit)
-- ==========================================

CREATE TABLE IF NOT EXISTS quick_apply_usage (
  ip_address text NOT NULL,
  last_used_at date DEFAULT CURRENT_DATE,
  PRIMARY KEY (ip_address)
);

ALTER TABLE quick_apply_usage ENABLE ROW LEVEL SECURITY;

-- No public access policies needed as we use secure functions below

-- Function to check if IP is allowed (True if not used today)
CREATE OR REPLACE FUNCTION check_quick_apply_eligibility(user_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_date date;
BEGIN
  SELECT last_used_at INTO last_date FROM quick_apply_usage WHERE ip_address = user_ip;
  
  -- If no record, or last used date is before today, return true
  IF last_date IS NULL OR last_date < CURRENT_DATE THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function to record usage
CREATE OR REPLACE FUNCTION record_quick_apply_usage(user_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO quick_apply_usage (ip_address, last_used_at)
  VALUES (user_ip, CURRENT_DATE)
  ON CONFLICT (ip_address)
  DO UPDATE SET last_used_at = CURRENT_DATE;
END;
$$;

-- ==========================================
-- 10. ANALYTICS & LOGGING
-- ==========================================

-- Admin Activity Logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only view logs" ON admin_logs;
CREATE POLICY "Admin only view logs" ON admin_logs
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only insert logs" ON admin_logs;
CREATE POLICY "Admin only insert logs" ON admin_logs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  session_token text,
  message text NOT NULL,
  stack text,
  path text,
  metadata jsonb,
  is_solved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only view error logs" ON error_logs;
CREATE POLICY "Admin only view error logs" ON error_logs
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only update error logs" ON error_logs;
CREATE POLICY "Admin only update error logs" ON error_logs
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow public insert error logs" ON error_logs;
CREATE POLICY "Allow public insert error logs" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  source text DEFAULT 'cv_download',
  job_type text,
  seniority text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only view leads" ON leads;
CREATE POLICY "Admin only view leads" ON leads
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete leads" ON leads;
CREATE POLICY "Admin only delete leads" ON leads
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow public insert leads" ON leads;
CREATE POLICY "Allow public insert leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Page Views (Traffic)
CREATE TABLE IF NOT EXISTS page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  session_token text,
  path text NOT NULL,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only view page views" ON page_views;
CREATE POLICY "Admin only view page views" ON page_views
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow public insert page views" ON page_views;
CREATE POLICY "Allow public insert page views" ON page_views
  FOR INSERT WITH CHECK (true);

-- Visitor Sessions (Live & Returning Tracking)
CREATE TABLE IF NOT EXISTS visitor_sessions (
  session_token text PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  is_returning boolean DEFAULT false,
  browser_info jsonb,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only view visitor sessions" ON visitor_sessions;
CREATE POLICY "Admin only view visitor sessions" ON visitor_sessions
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow public upsert visitor sessions" ON visitor_sessions;
CREATE POLICY "Allow public upsert visitor sessions" ON visitor_sessions
  FOR ALL USING (true);

-- User Events (CV Actions, etc.)
CREATE TABLE IF NOT EXISTS user_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token text,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  event_name text NOT NULL, -- 'cv_generated', 'use_own_cv', 'continue_to_app', 'headhunter_opt_in'
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Candidate Profiles (for Headhunter Search)
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  location text,
  summary text,
  skills text[],
  experience jsonb,
  education jsonb,
  seniority text,
  job_type text,
  cv_text text, -- For AI indexing/search
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for recruiters" ON candidate_profiles;
CREATE POLICY "Public read for recruiters" ON candidate_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'recruiter'
    ) OR auth.uid() = id
  );

-- Recruiter Searches
CREATE TABLE IF NOT EXISTS recruiter_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recruiter_id uuid REFERENCES auth.users NOT NULL,
  query_text text,
  query_params jsonb,
  results_count int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recruiter_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recruiters view own searches" ON recruiter_searches;
CREATE POLICY "Recruiters view own searches" ON recruiter_searches
  FOR SELECT USING (auth.uid() = recruiter_id);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only view user events" ON user_events;
CREATE POLICY "Admin only view user events" ON user_events
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow public insert user events" ON user_events;
CREATE POLICY "Allow public insert user events" ON user_events
  FOR INSERT WITH CHECK (true);

-- SECURE ANALYTICS FUNCTIONS
CREATE OR REPLACE FUNCTION get_admin_analytics_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_traffic int;
  total_revenue numeric;
  returning_users int;
  new_users int;
  live_sessions int;
  cv_generated int;
  own_cv_clicks int;
  continue_clicks int;
  recent_errors json;
BEGIN
  -- Check admin status
  IF auth.jwt() ->> 'email' != 'mqhele03@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Traffic (Last 24h)
  SELECT count(*) INTO total_traffic FROM page_views WHERE created_at > now() - interval '24 hours';
  
  -- Revenue (All time completed)
  SELECT coalesce(sum(amount), 0) INTO total_revenue FROM orders WHERE status = 'completed';
  
  -- Returning vs New (Last 7 days)
  SELECT count(*) INTO returning_users FROM visitor_sessions WHERE is_returning = true AND created_at > now() - interval '7 days';
  SELECT count(*) INTO new_users FROM visitor_sessions WHERE is_returning = false AND created_at > now() - interval '7 days';
  
  -- Live Sessions (Active in last 5 mins)
  SELECT count(*) INTO live_sessions FROM visitor_sessions WHERE last_active_at > now() - interval '5 minutes';
  
  -- CV Metrics
  SELECT count(*) INTO cv_generated FROM user_events WHERE event_name = 'cv_generated';
  SELECT count(*) INTO own_cv_clicks FROM user_events WHERE event_name = 'use_own_cv';
  SELECT count(*) INTO continue_clicks FROM user_events WHERE event_name = 'continue_to_app';

  -- Recent Errors
  SELECT json_agg(t) INTO recent_errors FROM (
    SELECT message, created_at FROM error_logs ORDER BY created_at DESC LIMIT 5
  ) t;

  RETURN json_build_object(
    'traffic_24h', total_traffic,
    'revenue_total', total_revenue,
    'returning_7d', returning_users,
    'new_7d', new_users,
    'live_sessions', live_sessions,
    'cv_generated', cv_generated,
    'own_cv_clicks', own_cv_clicks,
    'continue_clicks', continue_clicks,
    'recent_errors', recent_errors
  );
END;
$$;

  -- Detailed Analytics Function
DROP FUNCTION IF EXISTS get_detailed_analytics(text, text);
CREATE OR REPLACE FUNCTION get_detailed_analytics(metric_name text, time_range text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  interval_val interval;
  bucket_val text;
BEGIN
  IF auth.jwt() ->> 'email' != 'mqhele03@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  interval_val := CASE 
    WHEN time_range = '24h' THEN interval '24 hours'
    WHEN time_range = '7d' THEN interval '7 days'
    WHEN time_range = '30d' THEN interval '30 days'
    ELSE interval '100 years' END;

  bucket_val := CASE 
    WHEN time_range = '24h' THEN 'hour'
    ELSE 'day' END;

  IF metric_name = 'traffic' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM page_views
      WHERE created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'revenue' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, sum(amount) as value
      FROM orders
      WHERE status = 'completed' AND created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'returning_users' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM visitor_sessions
      WHERE is_returning = true AND created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'new_users' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM visitor_sessions
      WHERE is_returning = false AND created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'cv_generation' OR metric_name = 'cv_generated' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM user_events
      WHERE event_name = 'cv_generated' AND created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'own_cv_clicks' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM user_events
      WHERE event_name = 'use_own_cv' AND created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'continue_clicks' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM user_events
      WHERE event_name = 'continue_to_app' AND created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  ELSIF metric_name = 'errors' THEN
    SELECT json_agg(t) INTO result FROM (
      SELECT date_trunc(bucket_val, created_at) as time_bucket, count(*) as value
      FROM error_logs
      WHERE created_at > now() - interval_val
      GROUP BY 1 ORDER BY 1 ASC
    ) t;
  END IF;

  RETURN result;
END;
$$;

-- Live Sessions Details
CREATE OR REPLACE FUNCTION get_live_sessions_details()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF auth.jwt() ->> 'email' != 'mqhele03@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t) INTO result FROM (
    SELECT 
      vs.session_token,
      vs.last_active_at,
      vs.is_returning,
      (SELECT path FROM page_views pv WHERE pv.session_token = vs.session_token ORDER BY created_at DESC LIMIT 1) as current_path,
      (SELECT count(*) FROM page_views pv WHERE pv.session_token = vs.session_token) as page_count
    FROM visitor_sessions vs
    WHERE vs.last_active_at > now() - interval '5 minutes'
    ORDER BY vs.last_active_at DESC
  ) t;

  RETURN result;
END;
$$;

-- User Journey Details
CREATE OR REPLACE FUNCTION get_user_journey(target_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF auth.jwt() ->> 'email' != 'mqhele03@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(t) INTO result FROM (
    SELECT path, created_at
    FROM page_views
    WHERE session_token = target_session_token
    ORDER BY created_at ASC
  ) t;

  RETURN result;
END;
$$;

-- Recruiter Search Credits Logic
CREATE OR REPLACE FUNCTION use_recruiter_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits int;
BEGIN
  SELECT credits INTO current_credits FROM profiles WHERE id = auth.uid();
  
  IF current_credits > 0 OR (SELECT plan_id FROM profiles WHERE id = auth.uid()) = 'pro' THEN
    IF (SELECT plan_id FROM profiles WHERE id = auth.uid()) != 'pro' THEN
      UPDATE profiles SET credits = credits - 1 WHERE id = auth.uid();
    END IF;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

