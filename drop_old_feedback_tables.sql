-- ============================================================================
--  DROP LEGACY FEEDBACK TABLES  —  run in a LATER PR, NOT with the unify PR.
-- ----------------------------------------------------------------------------
--  Only run this AFTER unify_feedbacks_migration.sql has been applied and the
--  unified childsmile_app_feedbacks table has been verified working in
--  production (the two legacy tables are kept as a backup until then).
--
--  In the SAME PR that runs this script you must ALSO remove the now-unused
--  Django models and their references, otherwise the app will error at import:
--    * models.py            -> delete classes Feedback, Tutor_Feedback, General_V_Feedback
--    * unused_views.py      -> delete FeedbackViewSet, Tutor_FeedbackViewSet,
--                              General_V_FeedbackViewSet
--    * urls.py              -> delete their router.register(...) lines + imports
--    * feedback_views.py / report_views.py -> drop the now-unused Feedback /
--                              Tutor_Feedback / General_V_Feedback imports
--    * admin.py (if registered) -> unregister the three models
--
--  Target: PostgreSQL. Children (with FK to the parent) are dropped first.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.childsmile_app_tutor_feedback;
DROP TABLE IF EXISTS public.childsmile_app_general_v_feedback;
DROP TABLE IF EXISTS public.childsmile_app_feedback;

COMMIT;
