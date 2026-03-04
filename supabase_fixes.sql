-- 1. Add original_link column to cv_applications
ALTER TABLE public.cv_applications
ADD COLUMN IF NOT EXISTS original_link TEXT;

-- 2. Create quick_apply_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quick_apply_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_quick_apply_usage_ip_created_at 
ON public.quick_apply_usage(ip_address, created_at);

-- 4. Function to check quick apply eligibility
CREATE OR REPLACE FUNCTION public.check_quick_apply_eligibility(user_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage_count INT;
BEGIN
    SELECT COUNT(*) INTO usage_count
    FROM public.quick_apply_usage
    WHERE ip_address = user_ip
    AND created_at > NOW() - INTERVAL '24 hours';

    RETURN usage_count < 3;
END;
$$;

-- 5. Function to record quick apply usage
CREATE OR REPLACE FUNCTION public.record_quick_apply_usage(user_ip TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.quick_apply_usage (ip_address)
    VALUES (user_ip);
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_quick_apply_eligibility(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_quick_apply_usage(TEXT) TO authenticated, anon;
