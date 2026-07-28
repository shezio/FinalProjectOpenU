-- Add delivered_date (תאריך מסירה) to childsmile_app_voucherrecipient
-- Direct SQL (NO MIGRATION) — same convention as every other vouchers/finance change.
--
-- Context: recipients originally tracked only `delivered` (כן / איסוף עצמי / לא).
-- This adds the DATE the voucher was actually handed over / picked up. It is
-- NULLABLE for backward compatibility (existing rows have no date) and because
-- `delivered` itself is optional — validation is API/UI-layer only (no CHECK
-- constraint), same convention as every other rule in this app. The UI defaults
-- it to today and requires it when `delivered` is 'כן'/'איסוף עצמי', but the
-- backend accepts null.

ALTER TABLE childsmile_app_voucherrecipient
ADD COLUMN IF NOT EXISTS delivered_date DATE NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'childsmile_app_voucherrecipient'
AND column_name = 'delivered_date';
