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

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ✅ NEW: Allow users to insert their own profile
CREATE POLICY IF NOT EXISTS "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ==========================================
-- 2. APPLICATIONS TABLE
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

DROP POLICY IF EXISTS "Users view own applications" ON applications;
CREATE POLICY "Users view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for creation" ON applications;
CREATE POLICY "Allow insert for creation"
  ON applications FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

DROP POLICY IF EXISTS "Allow claim of guest apps" ON applications;
CREATE POLICY "Allow claim of guest apps"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users delete own applications" ON applications;
CREATE POLICY "Users delete own applications"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);


-- ==========================================
-- 3. JOB LISTINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS job_listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  summary text,
  description text,
  original_link text,
  example_cv_content text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to jobs" ON job_listings;
CREATE POLICY "Public read access to jobs"
  ON job_listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin only insert" ON job_listings;
CREATE POLICY "Admin only insert"
  ON job_listings FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only update" ON job_listings;
CREATE POLICY "Admin only update"
  ON job_listings FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete" ON job_listings;
CREATE POLICY "Admin only delete"
  ON job_listings FOR DELETE
  USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');


-- ==========================================
-- 4. ARTICLES
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

DROP POLICY IF EXISTS "Public read access to articles" ON articles;
CREATE POLICY "Public read access to articles"
  ON articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin only insert articles" ON articles;
CREATE POLICY "Admin only insert articles"
  ON articles FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only update articles" ON articles;
CREATE POLICY "Admin only update articles"
  ON articles FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete articles" ON articles;
CREATE POLICY "Admin only delete articles"
  ON articles FOR DELETE
  USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');


-- ==========================================
-- 5. DAILY USAGE + FUNCTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS daily_usage (
  identifier text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  cv_count int DEFAULT 0,
  search_count int DEFAULT 0,
  PRIMARY KEY (identifier, date)
);

ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read usage" ON daily_usage;
CREATE POLICY "Allow read usage"
  ON daily_usage FOR SELECT USING (true);


-- ==========================================
-- ✅ UPDATED HANDLE NEW USER FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _err text;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;

    INSERT INTO public.error_logs (user_id, message, stack, path, metadata)
    VALUES (
      NEW.id,
      left(_err, 1000),
      NULL,
      'handle_new_user',
      jsonb_build_object('new', row_to_json(NEW))
    );
  END;

  RETURN NEW;
END;
$$;


-- ✅ ENSURE TRIGGER EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trigger_handle_new_user'
      AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;
