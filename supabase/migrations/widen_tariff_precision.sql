-- Store tariff rates at full precision (up to 8 decimals) instead of 4.
-- Run this in the Supabase SQL Editor.
--
-- Safe and additive: widening the precision keeps every existing value
-- exactly as it is. Nothing is deleted, rounded, or lost. Only tariff rates
-- entered AFTER this runs will be stored with their extra decimals.

ALTER TABLE customers ALTER COLUMN tariff_rate TYPE DECIMAL(14, 8);
ALTER TABLE invoices  ALTER COLUMN tariff_rate TYPE DECIMAL(14, 8);
