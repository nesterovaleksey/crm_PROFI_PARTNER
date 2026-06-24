-- Create drivers table
CREATE TABLE public.drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create verification_codes table
CREATE TABLE public.verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create weekly_incomes table
CREATE TABLE public.weekly_incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    period_name TEXT NOT NULL, -- e.g. "11.05-17.05 2024"
    file_name TEXT, -- To track which file this came from (for rollback)
    uber_netto_gotowka NUMERIC DEFAULT 0,
    bolt_netto_gotowka NUMERIC DEFAULT 0,
    freenow_netto_k NUMERIC DEFAULT 0,
    uber_netto NUMERIC DEFAULT 0,
    bolt_netto NUMERIC DEFAULT 0,
    freenow_netto_l NUMERIC DEFAULT 0,
    vat NUMERIC DEFAULT 0,
    partner NUMERIC DEFAULT 0,
    auto NUMERIC DEFAULT 0,
    korekty NUMERIC DEFAULT 0,
    zus NUMERIC DEFAULT 0,
    do_wyplaty NUMERIC DEFAULT 0,
    zwrot_kosztow NUMERIC DEFAULT 0,
    umowa_zlecenie NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_drivers_telegram_id ON public.drivers(telegram_id);
CREATE INDEX idx_drivers_email ON public.drivers(email);
CREATE INDEX idx_weekly_incomes_driver_period ON public.weekly_incomes(driver_id, period_name);
CREATE INDEX idx_weekly_incomes_file_name ON public.weekly_incomes(file_name);
