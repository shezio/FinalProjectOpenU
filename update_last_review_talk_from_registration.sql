-- Update last_review_talk_conducted to registrationdate
-- for all families where last_review_talk_conducted is NULL

UPDATE childsmile_app_children
SET last_review_talk_conducted = registrationdate
WHERE last_review_talk_conducted IS NULL;
