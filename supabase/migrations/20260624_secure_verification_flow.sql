-- Step 1: Drop any public policies for verification_codes table (restricts all direct client operations)
DROP POLICY IF EXISTS "Allow public all to verification_codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow public insert to verification_codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow public update to verification_codes" ON public.verification_codes;

-- Step 2: Create secure function to generate and save verification code on the server side
CREATE OR REPLACE FUNCTION public.request_verification_code(p_email TEXT)
RETURNS TABLE (
    success BOOLEAN,
    code TEXT,
    full_name TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path against search path hijacking
AS $$
DECLARE
    v_driver_name TEXT;
    v_is_active BOOLEAN;
    v_code TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Check if driver exists and is active
    SELECT drivers.full_name, drivers.is_active INTO v_driver_name, v_is_active 
    FROM public.drivers 
    WHERE email = LOWER(TRIM(p_email));

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 'Этот E-mail не зарегистрирован в базе PROFI CRM. Пожалуйста, обратитесь к администратору.'::TEXT;
        RETURN;
    END IF;

    IF v_is_active = FALSE THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 'Этот профиль деактивирован. Пожалуйста, обратитесь к администратору.'::TEXT;
        RETURN;
    END IF;

    -- 2. Generate random 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    v_expires_at := NOW() + INTERVAL '10 minutes';

    -- 3. Upsert verification code (SECURITY DEFINER runs as owner and bypasses RLS on verification_codes)
    INSERT INTO public.verification_codes (email, code, expires_at)
    VALUES (LOWER(TRIM(p_email)), v_code, v_expires_at)
    ON CONFLICT (email) 
    DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at;

    RETURN QUERY SELECT TRUE, v_code, v_driver_name, NULL::TEXT;
END;
$$;

-- Step 3: Create secure verification function
CREATE OR REPLACE FUNCTION public.verify_and_link_driver(
    p_email TEXT, 
    p_code TEXT, 
    p_telegram_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Look for the code inside the table securely
    SELECT * INTO v_record 
    FROM public.verification_codes 
    WHERE email = LOWER(TRIM(p_email)) 
      AND code = TRIM(p_code) 
      AND expires_at > NOW();

    IF FOUND THEN
        -- Link the Telegram ID
        UPDATE public.drivers 
        SET telegram_id = p_telegram_id 
        WHERE email = LOWER(TRIM(p_email));

        -- Delete the single-use verification code
        DELETE FROM public.verification_codes WHERE email = LOWER(TRIM(p_email));
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;
