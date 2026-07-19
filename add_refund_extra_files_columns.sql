-- Add extra receipt-file columns to childsmile_app_expenserefund (up to 3 files per refund)
-- Direct SQL (NO MIGRATION)
--
-- Context: refunds originally supported exactly ONE receipt via `file_url` (no
-- file_name/file_size tracked). This adds 2 more full file "slots" (url/name/size)
-- plus name/size metadata for the original slot, so a refund can have up to 3
-- files total. Combined size cap (10MB) is enforced client-side in Refunds.js —
-- these are plain nullable columns, no CHECK constraints, same convention as
-- every other validation rule in this app (API-layer only).

ALTER TABLE childsmile_app_expenserefund
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS file_size BIGINT NULL,
ADD COLUMN IF NOT EXISTS file_url_2 VARCHAR(2048) NULL,
ADD COLUMN IF NOT EXISTS file_name_2 VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS file_size_2 BIGINT NULL,
ADD COLUMN IF NOT EXISTS file_url_3 VARCHAR(2048) NULL,
ADD COLUMN IF NOT EXISTS file_name_3 VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS file_size_3 BIGINT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'childsmile_app_expenserefund'
AND column_name IN (
    'file_url', 'file_name', 'file_size',
    'file_url_2', 'file_name_2', 'file_size_2',
    'file_url_3', 'file_name_3', 'file_size_3'
);
