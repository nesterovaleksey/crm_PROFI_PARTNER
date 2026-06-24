-- Migration: Add remaining columns from Excel raport sheet to weekly_incomes table
ALTER TABLE public.weekly_incomes
ADD COLUMN imie_nazwisko TEXT,
ADD COLUMN numer_tel TEXT,
ADD COLUMN email TEXT,
ADD COLUMN uber_brutto NUMERIC DEFAULT 0,
ADD COLUMN bolt_brutto NUMERIC DEFAULT 0,
ADD COLUMN freenow_brutto NUMERIC DEFAULT 0,
ADD COLUMN brutto_3_apl NUMERIC DEFAULT 0,
ADD COLUMN umowa_najmu NUMERIC DEFAULT 0;
