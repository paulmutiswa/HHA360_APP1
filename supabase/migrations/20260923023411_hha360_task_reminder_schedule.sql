/*
# HHA360 Task Reminder Schedule

Adds a local reminder time and enable/disable flag to saved tasks.
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time time;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS tasks_reminder_schedule_idx ON tasks(due_date, due_time) WHERE completed = false AND reminder_enabled = true;