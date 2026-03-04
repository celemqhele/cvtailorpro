-- UPDATES FOR CV TRACKING AND LOG MANAGEMENT

-- 1. Add metadata column to cv_applications if it doesn't exist
ALTER TABLE public.cv_applications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add a function to clear error logs (Admin only)
CREATE OR REPLACE FUNCTION public.clear_error_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the user is the admin
    IF (auth.jwt() ->> 'email' = 'mqhele03@gmail.com') THEN
        DELETE FROM public.error_logs;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only admins can clear logs.';
    END IF;
END;
$$;

-- 3. Grant execute permission to authenticated users (the function itself checks for admin email)
GRANT EXECUTE ON FUNCTION public.clear_error_logs() TO authenticated;
