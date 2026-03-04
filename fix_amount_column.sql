-- FIX FOR "column amount does not exist"
-- Run this in your Supabase SQL Editor

-- 1. Ensure orders table has the amount column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='amount') THEN
        ALTER TABLE orders ADD COLUMN amount numeric DEFAULT 0;
    END IF;
END $$;

-- 2. Update the analytics summary function to be more resilient
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
        'revenue_total', (
            SELECT COALESCE(sum(amount), 0) 
            FROM orders 
            WHERE status = 'completed'
        ),
        'traffic_total', (SELECT count(*) FROM page_views),
        'errors_unsolved', (SELECT count(*) FROM error_logs WHERE is_solved = false)
    ) INTO result;
    RETURN result;
END;
$$;

-- 3. Update detailed analytics function
CREATE OR REPLACE FUNCTION get_detailed_analytics(metric_name TEXT, time_range TEXT)
RETURNS TABLE (time_bucket TIMESTAMPTZ, metric_value BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

    ELSIF metric_name = 'revenue' THEN
        RETURN QUERY
        SELECT date_trunc(
            CASE WHEN time_range = '24h' THEN 'hour' ELSE 'day' END,
            created_at
        ) as time_bucket,
        COALESCE(sum(amount), 0)::BIGINT as metric_value
        FROM orders
        WHERE status = 'completed'
        AND created_at > (CASE 
            WHEN time_range = '24h' THEN NOW() - INTERVAL '24 hours'
            WHEN time_range = '7d' THEN NOW() - INTERVAL '7 days'
            ELSE NOW() - INTERVAL '30 days'
        END)
        GROUP BY 1 ORDER BY 1;
    END IF;
END;
$$;
