-- ============================================================================
-- add_children_lookup_view.sql
--
-- SECURITY HARDENING: a minimal, read-only VIEW over childsmile_app_children
-- exposing ONLY the columns that are safe to use for "pick a family by name"
-- UI pickers and "linked_child_name" display labels — id, first/last name,
-- city, status. NO medical data (medical_diagnosis, treating_hospital,
-- current_medical_state, etc.), NO phone numbers, NO street address, NO
-- coordinator notes.
--
-- WHY `status` IS INCLUDED (not just id/name/city):
--   Vouchers' עמותה-type questionnaire has its OWN self-reported
--   child_treatment_status field (the family fills it in). Once staff link a
--   submitted recipient to a real registered child, they need to compare that
--   self-reported value against the child's REAL, current status
--   (טיפולים/מעקבים/אחזקה/ז״ל/בריא/עזב) to catch a stale/contradicting report
--   (e.g. family reports "טיפולים" but the system already shows "ז״ל"/"עזב").
--   `status` is a workflow/lifecycle field, not medical/diagnostic detail —
--   same sensitivity tier as `city`, safe to include here.
--
-- WHY A VIEW INSTEAD OF JUST "BE CAREFUL IN THE SERIALIZER":
--   Financial Aid and Vouchers both let staff link a record to a family via
--   child_id (a plain internal FK, not a search on medical data), and both
--   show a small "family search" dropdown + a "linked_child_name" label.
--   Previously this was done by querying the full childsmile_app_children
--   table (Children model / select_related('linked_child')) and manually
--   picking 2-3 fields back out in Python. That "works" today, but every
--   sensitive column (medical_diagnosis, treating_hospital, current_medical_
--   state, etc.) was still pulled into application memory on every request,
--   and the ONLY thing stopping it from leaking into an API response was
--   serializer code discipline — a single careless `model_to_dict(child)` or
--   a copy-pasted field addition in a future edit would leak medical records
--   through what's supposed to be a "pick a family" combo box.
--
--   A DB-level VIEW makes this a structural guarantee instead of a code-
--   review hope: the view's result set physically does not contain the
--   sensitive columns, so no application-layer bug in Financial Aid/Vouchers
--   code can ever expose them via this path, no matter what gets added to a
--   serializer later.
--
-- NOTE: FinancialAid.linked_child / VoucherRecipient.linked_child stay as
-- real ForeignKeys against childsmile_app_children(child_id) directly — a
-- Postgres FK constraint cannot target a view. This view is ONLY used for
-- READS (search dropdown options + display labels + lightweight existence
-- checks), never for the FK constraint itself.
--
-- NOTE 2 (scope): this view is currently used ONLY by voucher_views.py, which
-- has a genuine unauthenticated public surface (the questionnaire endpoints).
-- financial_aid_views.py is 100% authenticated-admin-only with no public
-- surface, so it queries childsmile_app_children directly (no extra benefit
-- from the view there — see /memories/repo/childsmile-backend.md).
-- ============================================================================

CREATE OR REPLACE VIEW childsmile_app_children_lookup AS
SELECT
    child_id,
    childfirstname,
    childsurname,
    city,
    status
FROM childsmile_app_children;

-- Verify:
-- SELECT * FROM childsmile_app_children_lookup LIMIT 5;
-- \d childsmile_app_children_lookup   -- confirm only 5 columns exist
