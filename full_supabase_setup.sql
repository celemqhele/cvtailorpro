-- COMPLETE SUPABASE ANALYTICS SETUP
-- Run this in your Supabase SQL Editor to create tables, functions, and policies.

-- 1. TABLES
-- Visitor Sessions
CREATE TABLE IF NOT EXISTS visitor_sessions (
    session_token UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    browser_info JSONB,
    is_returning BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page Views
CREATE TABLE IF NOT EXISTS page_views (
    id BIGSERIAL PRIMARY KEY,
    session_token UUID REFERENCES visitor_sessions(session_token),
    path TEXT NOT NULL,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Events (Tracking clicks, generations, etc.)
CREATE TABLE IF NOT EXISTS user_events (
    id BIGSERIAL PRIMARY KEY,
    session_token UUID REFERENCES visitor_sessions(session_token),
    user_id UUID REFERENCES auth.users(id),
    event_name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token UUID REFERENCES visitor_sessions(session_token),
    message TEXT NOT NULL,
    stack TEXT,
    path TEXT,
    is_solved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Activity Logs
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RPC FUNCTIONS FOR DASHBOARD

-- Summary Stats
CREATE OR REPLACE FUNCTION get_admin_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'cv_generated', (SELECT count(*) FROM user_events WHERE event_name = 'cv_generated'),
        'revenue_total', COALESCE((SELECT sum(amount) FROM orders WHERE status = 'completed'), 0),
        'traffic_total', (SELECT count(*) FROM page_views),
        'errors_unsolved', (SELECT count(*) FROM error_logs WHERE is_solved = false)
    ) INTO result;
    RETURN result;
END;
$$;

-- Detailed Time-Series Data
CREATE OR REPLACE FUNCTION get_detailed_analytics(metric_name TEXT, time_range TEXT)
RETURNS TABLE (time_bucket TIMESTAMPTZ, metric_value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    interval_val INTERVAL;
BEGIN
    IF time_range = '24h' THEN interval_val := '1 hour';
    ELSIF time_range = '7d' THEN interval_val := '1 day';
    ELSE interval_val := '1 day';
    END IF;

    IF metric_name = 'traffic' THEN
        RETURN QUERY
        SELECT date_trunc(
            CASE WHEN time_range = '24h' THEN 'hour' ELSE 'day' END,
            created_at
        ) as time_bucket,
        count(*)::BIGINT as metric_value
        FROM page_views
        WHERE created_at > (CASE 
            WHEN time_range = '24h' THEN NOW() - INTERVAL '24 hours'
            WHEN time_range = '7d' THEN NOW() - INTERVAL '7 days'
            ELSE NOW() - INTERVAL '30 days'
        END)
        GROUP BY 1 ORDER BY 1;
        
    ELSIF metric_name = 'cv_generated' THEN
        RETURN QUERY
        SELECT date_trunc(
            CASE WHEN time_range = '24h' THEN 'hour' ELSE 'day' END,
            created_at
        ) as time_bucket,
        count(*)::BIGINT as metric_value
        FROM user_events
        WHERE event_name = 'cv_generated'
        AND created_at > (CASE 
            WHEN time_range = '24h' THEN NOW() - INTERVAL '24 hours'
            WHEN time_range = '7d' THEN NOW() - INTERVAL '7 days'
            ELSE NOW() - INTERVAL '30 days'
        END)
        GROUP BY 1 ORDER BY 1;
    END IF;
END;
$$;

-- Live Sessions Details
CREATE OR REPLACE FUNCTION get_live_sessions_details()
RETURNS TABLE (
    session_token UUID,
    last_active_at TIMESTAMPTZ,
    browser_info JSONB,
    is_returning BOOLEAN,
    last_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.session_token,
        s.last_active_at,
        s.browser_info,
        s.is_returning,
        (SELECT path FROM page_views pv WHERE pv.session_token = s.session_token ORDER BY created_at DESC LIMIT 1) as last_path
    FROM visitor_sessions s
    WHERE s.last_active_at > NOW() - INTERVAL '30 minutes'
    ORDER BY s.last_active_at DESC;
END;
$$;

-- User Journey
CREATE OR REPLACE FUNCTION get_user_journey(target_session_token UUID)
RETURNS TABLE (
    event_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    (SELECT 'page_view' as event_type, path as description, created_at, NULL::JSONB as metadata
     FROM page_views WHERE session_token = target_session_token)
    UNION ALL
    (SELECT 'event' as event_type, event_name as description, created_at, metadata
     FROM user_events WHERE session_token = target_session_token)
    ORDER BY created_at ASC;
END;
$$;

-- 3. RLS POLICIES
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to track
CREATE POLICY "Allow anon insert visitor_sessions" ON visitor_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update visitor_sessions" ON visitor_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon insert page_views" ON page_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon insert user_events" ON user_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon insert error_logs" ON error_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin Only Access
CREATE POLICY "Allow admin select visitor_sessions" ON visitor_sessions FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');
CREATE POLICY "Allow admin select page_views" ON page_views FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');
CREATE POLICY "Allow admin select user_events" ON user_events FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');
CREATE POLICY "Allow admin select error_logs" ON error_logs FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');
CREATE POLICY "Allow admin all admin_activity_logs" ON admin_activity_logs FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'mqhele03@gmail.com');

-- 4. PERMISSIONS
GRANT INSERT, UPDATE ON visitor_sessions TO anon, authenticated;
GRANT INSERT ON page_views TO anon, authenticated;
GRANT INSERT ON user_events TO anon, authenticated;
GRANT INSERT ON error_logs TO anon, authenticated;

GRANT SELECT ON visitor_sessions TO authenticated;
GRANT SELECT ON page_views TO authenticated;
GRANT SELECT ON user_events TO authenticated;
GRANT SELECT ON error_logs TO authenticated;
GRANT ALL ON admin_activity_logs TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
