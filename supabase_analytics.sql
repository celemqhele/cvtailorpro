-- Supabase Analytics Schema & Functions

-- 1. Tables
CREATE TABLE IF NOT EXISTS visitor_sessions (
    session_token UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    is_returning BOOLEAN DEFAULT false,
    browser_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
    id BIGSERIAL PRIMARY KEY,
    session_token UUID REFERENCES visitor_sessions(session_token),
    path TEXT NOT NULL,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_events (
    id BIGSERIAL PRIMARY KEY,
    session_token UUID REFERENCES visitor_sessions(session_token),
    user_id UUID REFERENCES auth.users(id),
    event_name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    session_token UUID REFERENCES visitor_sessions(session_token),
    message TEXT NOT NULL,
    stack TEXT,
    path TEXT,
    is_solved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_token);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_token);
CREATE INDEX IF NOT EXISTS idx_user_events_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active ON visitor_sessions(last_active_at);

-- 3. Analytics Functions (RPCs)

-- Summary stats for Admin Dashboard
CREATE OR REPLACE FUNCTION get_admin_analytics_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_visitors', (SELECT count(DISTINCT session_token) FROM visitor_sessions),
        'total_cvs_generated', (SELECT count(*) FROM user_events WHERE event_name = 'cv_generated'),
        'total_leads', (SELECT count(*) FROM user_events WHERE event_name = 'lead_captured'),
        'active_last_24h', (SELECT count(DISTINCT session_token) FROM visitor_sessions WHERE last_active_at > NOW() - INTERVAL '24 hours'),
        'active_last_1h', (SELECT count(DISTINCT session_token) FROM visitor_sessions WHERE last_active_at > NOW() - INTERVAL '1 hour')
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detailed analytics for charts
CREATE OR REPLACE FUNCTION get_detailed_analytics(days_limit INT DEFAULT 30)
RETURNS TABLE (
    date DATE,
    page_views BIGINT,
    cvs_generated BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (days_limit - 1) * INTERVAL '1 day',
            CURRENT_DATE,
            '1 day'::interval
        )::date AS d
    )
    SELECT 
        ds.d,
        COALESCE(pv.count, 0) as page_views,
        COALESCE(ue.count, 0) as cvs_generated,
        COALESCE(vs.count, 0) as unique_visitors
    FROM date_series ds
    LEFT JOIN (
        SELECT created_at::date as d, count(*) as count 
        FROM page_views 
        GROUP BY 1
    ) pv ON ds.d = pv.d
    LEFT JOIN (
        SELECT created_at::date as d, count(*) as count 
        FROM user_events 
        WHERE event_name = 'cv_generated'
        GROUP BY 1
    ) ue ON ds.d = ue.d
    LEFT JOIN (
        SELECT created_at::date as d, count(DISTINCT session_token) as count 
        FROM visitor_sessions 
        GROUP BY 1
    ) vs ON ds.d = vs.d
    ORDER BY ds.d DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Live sessions details
CREATE OR REPLACE FUNCTION get_live_sessions_details()
RETURNS TABLE (
    session_token UUID,
    user_email TEXT,
    last_path TEXT,
    last_active_at TIMESTAMPTZ,
    is_returning BOOLEAN,
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.session_token,
        u.email as user_email,
        (SELECT path FROM page_views WHERE session_token = vs.session_token ORDER BY created_at DESC LIMIT 1) as last_path,
        vs.last_active_at,
        vs.is_returning,
        (SELECT count(*) FROM user_events WHERE session_token = vs.session_token) as event_count
    FROM visitor_sessions vs
    LEFT JOIN auth.users u ON vs.user_id = u.id
    WHERE vs.last_active_at > NOW() - INTERVAL '1 hour'
    ORDER BY vs.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User journey for a specific session
CREATE OR REPLACE FUNCTION get_user_journey(target_session_token UUID)
RETURNS TABLE (
    event_type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    (
        SELECT 'page_view' as event_type, path as description, created_at, NULL::jsonb as metadata
        FROM page_views
        WHERE session_token = target_session_token
    )
    UNION ALL
    (
        SELECT 'event' as event_type, event_name as description, created_at, metadata
        FROM user_events
        WHERE session_token = target_session_token
    )
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
