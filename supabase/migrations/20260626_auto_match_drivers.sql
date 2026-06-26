-- Function to auto-match weekly_incomes rows to drivers table on INSERT
CREATE OR REPLACE FUNCTION public.match_weekly_income_to_driver()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_id UUID;
BEGIN
    -- 1. Try matching by email (most unique)
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
        SELECT id INTO v_driver_id 
        FROM public.drivers 
        WHERE LOWER(email) = LOWER(NEW.email) 
        LIMIT 1;
    END IF;
    
    -- 2. If not found, try matching by name (case-insensitive, trimmed)
    IF v_driver_id IS NULL AND NEW.imie_nazwisko IS NOT NULL AND NEW.imie_nazwisko <> '' THEN
        SELECT id INTO v_driver_id 
        FROM public.drivers 
        WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(NEW.imie_nazwisko)) 
        LIMIT 1;
    END IF;

    -- Set the driver_id
    NEW.driver_id := v_driver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute matching before inserting weekly incomes
DROP TRIGGER IF EXISTS tr_match_weekly_income_driver ON public.weekly_incomes;
CREATE TRIGGER tr_match_weekly_income_driver
BEFORE INSERT ON public.weekly_incomes
FOR EACH ROW
EXECUTE FUNCTION public.match_weekly_income_to_driver();


-- Function to link past weekly incomes to a newly created/updated driver
CREATE OR REPLACE FUNCTION public.link_incomes_on_driver_changes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.weekly_incomes
    SET driver_id = NEW.id
    WHERE driver_id IS NULL
      AND (
          (email IS NOT NULL AND email <> '' AND LOWER(email) = LOWER(NEW.email))
          OR (imie_nazwisko IS NOT NULL AND imie_nazwisko <> '' AND LOWER(TRIM(imie_nazwisko)) = LOWER(TRIM(NEW.full_name)))
      );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to link past incomes when driver is created or updated
DROP TRIGGER IF EXISTS tr_link_incomes_on_driver_changes ON public.drivers;
CREATE TRIGGER tr_link_incomes_on_driver_changes
AFTER INSERT OR UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.link_incomes_on_driver_changes();


-- Run immediate one-off cleanup for any currently unlinked rows
UPDATE public.weekly_incomes wi
SET driver_id = d.id
FROM public.drivers d
WHERE wi.driver_id IS NULL
  AND (
      (wi.email IS NOT NULL AND wi.email <> '' AND LOWER(wi.email) = LOWER(d.email))
      OR (wi.imie_nazwisko IS NOT NULL AND wi.imie_nazwisko <> '' AND LOWER(TRIM(wi.imie_nazwisko)) = LOWER(TRIM(d.full_name)))
  );
