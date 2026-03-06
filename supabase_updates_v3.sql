-- SQL to support new analytics and revenue tracking

-- 1. Create a function to clear error logs
CREATE OR REPLACE FUNCTION clear_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' = 'mqhele03@gmail.com' THEN
    DELETE FROM error_logs;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

-- 2. SQL for Revenue Tracking (assuming orders table exists)
-- If you need a payment reference, add it to the orders table:
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference text;

-- 3. SQL to retrieve revenue in Rands (assuming amount is already in Rands)
CREATE OR REPLACE FUNCTION get_revenue_stats(time_range text DEFAULT '7d')
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

  SELECT json_agg(t) INTO result FROM (
    SELECT date_trunc(bucket_val, created_at) as time_bucket, sum(amount) as revenue_zar
    FROM orders
    WHERE status = 'completed' AND created_at > now() - interval_val
    GROUP BY 1 ORDER BY 1 ASC
  ) t;

  RETURN result;
END;
$$;
