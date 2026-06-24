-- 1. Enable RLS on tables
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insecure policies from earlier migrations if they exist
DROP POLICY IF EXISTS "Allow public insert to drivers" ON public.drivers;
DROP POLICY IF EXISTS "Allow public delete to drivers" ON public.drivers;

-- 3. Drivers table policies
-- Admins can read all drivers. Drivers can read their own profile.
CREATE POLICY "Drivers can view their own profile" 
ON public.drivers 
FOR SELECT 
USING (id = auth.uid() OR (auth.jwt() ->> 'is_admin')::boolean = true);

-- Admins can insert/update/delete drivers
CREATE POLICY "Admins can insert drivers" 
ON public.drivers 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update drivers" 
ON public.drivers 
FOR UPDATE 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete drivers" 
ON public.drivers 
FOR DELETE 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

-- 4. Weekly Incomes table policies
-- Drivers can view their own incomes. Admins can view all incomes.
CREATE POLICY "Drivers can view their own incomes" 
ON public.weekly_incomes 
FOR SELECT 
USING (driver_id = auth.uid() OR (auth.jwt() ->> 'is_admin')::boolean = true);

-- Only admins can insert/update/delete incomes
CREATE POLICY "Admins can insert incomes" 
ON public.weekly_incomes 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update incomes" 
ON public.weekly_incomes 
FOR UPDATE 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete incomes" 
ON public.weekly_incomes 
FOR DELETE 
USING ((auth.jwt() ->> 'is_admin')::boolean = true);

-- 5. Verification Codes policies (no one needs direct access, functions bypass RLS)
-- Handled by simply enabling RLS and providing NO policies.
