CREATE OR REPLACE FUNCTION public.request_verification_code(p_email TEXT)
RETURNS TABLE (
    success BOOLEAN,
    code TEXT,
    full_name TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver_name TEXT;
    v_is_active BOOLEAN;
    v_code TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 0. Rate limiting check (cooldown 60 seconds)
    -- Since TTL is 10 minutes, if expires_at is > NOW() + 9 minutes, it means it was generated less than 1 minute ago.
    IF EXISTS (
        SELECT 1 FROM public.verification_codes 
        WHERE email = LOWER(TRIM(p_email)) 
          AND expires_at > NOW() + INTERVAL '9 minutes'
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 'Код уже отправлен. Пожалуйста, подождите 1 минуту перед повторным запросом.'::TEXT;
        RETURN;
    END IF;

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

    -- 3. Upsert verification code
    INSERT INTO public.verification_codes (email, code, expires_at)
    VALUES (LOWER(TRIM(p_email)), v_code, v_expires_at)
    ON CONFLICT (email) 
    DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at;

    RETURN QUERY SELECT TRUE, v_code, v_driver_name, NULL::TEXT;
END;
$$;
