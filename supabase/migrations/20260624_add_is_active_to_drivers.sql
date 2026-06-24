-- Migration: Add is_active column to drivers
ALTER TABLE public.drivers 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
