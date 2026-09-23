/*
# Remove Home Health Ref Hub tables

Drops all tables created for the Home Health Ref Hub app.
This deletes all data and cannot be undone.
*/

DROP TABLE IF EXISTS follow_up_reminders CASCADE;
DROP TABLE IF EXISTS visit_logs CASCADE;
DROP TABLE IF EXISTS referral_contacts CASCADE;
DROP TABLE IF EXISTS referral_facilities CASCADE;