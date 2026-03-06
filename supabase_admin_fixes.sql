
-- ==========================================
-- ADMIN PERMISSIONS & FUNCTIONS FIXES
-- ==========================================

-- 1. Add DELETE policy for error_logs
DROP POLICY IF EXISTS "Admin only delete error logs" ON error_logs;
CREATE POLICY "Admin only delete error logs" ON error_logs
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- 2. Create RPC function to clear all error logs
CREATE OR REPLACE FUNCTION clear_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin status
  IF auth.jwt() ->> 'email' = 'mqhele03@gmail.com' THEN
    DELETE FROM error_logs;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

-- 3. Create RPC function to clear admin logs
CREATE OR REPLACE FUNCTION clear_admin_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' = 'mqhele03@gmail.com' THEN
    DELETE FROM admin_activity_logs;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

-- 4. Add DELETE policy for admin_logs (optional but helpful)
DROP POLICY IF EXISTS "Admin only delete admin logs" ON admin_logs;
CREATE POLICY "Admin only delete admin logs" ON admin_logs
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- 4. Ensure admin can delete from other analytics tables if needed
DROP POLICY IF EXISTS "Admin only delete page views" ON page_views;
CREATE POLICY "Admin only delete page views" ON page_views
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete visitor sessions" ON visitor_sessions;
CREATE POLICY "Admin only delete visitor sessions" ON visitor_sessions
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

DROP POLICY IF EXISTS "Admin only delete user events" ON user_events;
CREATE POLICY "Admin only delete user events" ON user_events
  FOR DELETE USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- 5. RPC to clear all analytics (for a fresh start if requested)
CREATE OR REPLACE FUNCTION clear_all_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' = 'mqhele03@gmail.com' THEN
    DELETE FROM page_views;
    DELETE FROM visitor_sessions;
    DELETE FROM user_events;
    DELETE FROM error_logs;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;
