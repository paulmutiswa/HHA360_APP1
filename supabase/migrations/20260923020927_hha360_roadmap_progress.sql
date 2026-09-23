/*
# HHA360 Startup Roadmap Progress

1. New Table
- `roadmap_progress`: Per-agency startup roadmap step status tracking.
  - `id` (uuid PK)
  - `agency_id` (uuid FK to agencies, cascade delete)
  - `step_key` (text, identifies which roadmap step)
  - `status` (text: 'Not Started', 'In Progress', 'Needs Attention', 'Completed')
  - `updated_at` (timestamptz)
  - Unique constraint on (agency_id, step_key) so each agency has one record per step.

2. Security
- RLS enabled.
- Agency-scoped CRUD: only members of the same agency can read/write their roadmap progress.
*/

CREATE TABLE IF NOT EXISTS roadmap_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'Not Started',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, step_key)
);

CREATE INDEX IF NOT EXISTS roadmap_progress_agency_idx ON roadmap_progress(agency_id);

ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_read_roadmap" ON roadmap_progress;
CREATE POLICY "agency_read_roadmap" ON roadmap_progress FOR SELECT TO authenticated
  USING (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_insert_roadmap" ON roadmap_progress;
CREATE POLICY "agency_insert_roadmap" ON roadmap_progress FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_update_roadmap" ON roadmap_progress;
CREATE POLICY "agency_update_roadmap" ON roadmap_progress FOR UPDATE TO authenticated
  USING (agency_id = public.current_agency_id()) WITH CHECK (agency_id = public.current_agency_id());

DROP POLICY IF EXISTS "agency_delete_roadmap" ON roadmap_progress;
CREATE POLICY "agency_delete_roadmap" ON roadmap_progress FOR DELETE TO authenticated
  USING (agency_id = public.current_agency_id());