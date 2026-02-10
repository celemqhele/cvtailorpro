
-- 1. Add columns to store the extracted CV text and filename in the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_cv_content text,
ADD COLUMN IF NOT EXISTS last_cv_filename text;

-- 2. Ensure Row Level Security (RLS) allows users to UPDATE their own profile
-- Most Supabase starters have this by default, but if not, run this:
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 3. (Optional) Verify the profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
