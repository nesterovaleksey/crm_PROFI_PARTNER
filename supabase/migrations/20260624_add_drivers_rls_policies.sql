-- Migration: Add INSERT and DELETE RLS policies for drivers table
CREATE POLICY "Allow public insert to drivers" ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete to drivers" ON public.drivers FOR DELETE USING (true);
