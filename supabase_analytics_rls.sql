-- SQL to allow unauthenticated tracking in Supabase
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on analytics tables (if not already enabled)
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policies for INSERT (Allow anyone to track data)
-- This is necessary for unauthenticated users

-- Visitor Sessions
DROP POLICY IF EXISTS "Allow anon insert visitor_sessions" ON visitor_sessions;
CREATE POLICY "Allow anon insert visitor_sessions" ON visitor_sessions
FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update visitor_sessions" ON visitor_sessions;
CREATE POLICY "Allow anon update visitor_sessions" ON visitor_sessions
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Page Views
DROP POLICY IF EXISTS "Allow anon insert page_views" ON page_views;
CREATE POLICY "Allow anon insert page_views" ON page_views
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- User Events
DROP POLICY IF EXISTS "Allow anon insert user_events" ON user_events;
CREATE POLICY "Allow anon insert user_events" ON user_events
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Error Logs
DROP POLICY IF EXISTS "Allow anon insert error_logs" ON error_logs;
CREATE POLICY "Allow anon insert error_logs" ON error_logs
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 3. Ensure Admin can SELECT everything
DROP POLICY IF EXISTS "Allow admin select visitor_sessions" ON visitor_sessions;
CREATE POLICY "Allow admin select visitor_sessions" ON visitor_sessions
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow admin select page_views" ON page_views;
CREATE POLICY "Allow admin select page_views" ON page_views
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow admin select user_events" ON user_events;
CREATE POLICY "Allow admin select user_events" ON user_events
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Allow admin select error_logs" ON error_logs;
CREATE POLICY "Allow admin select error_logs" ON error_logs
FOR SELECT TO authenticated
USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- 4. Grant necessary permissions to anon and authenticated roles
GRANT INSERT, UPDATE ON visitor_sessions TO anon, authenticated;
GRANT INSERT ON page_views TO anon, authenticated;
GRANT INSERT ON user_events TO anon, authenticated;
GRANT INSERT ON error_logs TO anon, authenticated;

GRANT SELECT ON visitor_sessions TO authenticated;
GRANT SELECT ON page_views TO authenticated;
GRANT SELECT ON user_events TO authenticated;
GRANT SELECT ON error_logs TO authenticated;

-- 5. Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
