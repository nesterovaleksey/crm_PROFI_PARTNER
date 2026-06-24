-- Sync existing drivers to auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    d.id,
    'authenticated',
    'authenticated',
    d.email,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    false,
    false
FROM public.drivers d
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = d.id
);

-- Trigger to automatically sync future changes
CREATE OR REPLACE FUNCTION public.sync_driver_to_auth_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            is_sso_user,
            is_anonymous
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000'::uuid,
            NEW.id,
            'authenticated',
            'authenticated',
            NEW.email,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{}'::jsonb,
            now(),
            now(),
            false,
            false
        )
        ON CONFLICT (id) DO NOTHING;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE auth.users
        SET email = NEW.email,
            updated_at = now()
        WHERE id = OLD.id;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM auth.users WHERE id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_driver_changes ON public.drivers;
CREATE TRIGGER on_driver_changes
    AFTER INSERT OR UPDATE OF email OR DELETE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_driver_to_auth_users();
